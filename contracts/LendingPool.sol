// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { FHE, euint64, ebool } from "@fhevm/solidity/lib/FHE.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/ZamaConfig.sol";
import { ICreditEngine } from "./interfaces/ICreditEngine.sol";

/// @title LendingPool
/// @author Credora Protocol
/// @notice Confidential lending pool. Loan eligibility determined by encrypted credit score.
contract LendingPool is SepoliaConfig {
    uint64 public constant TIER_A_RATE_BPS = 500;    // 5.00% APR
    uint64 public constant TIER_B_RATE_BPS = 1200;   // 12.00% APR
    uint256 public constant TIER_A_MAX_LOAN = 10 ether;
    uint256 public constant TIER_B_MAX_LOAN = 5 ether;
    uint256 public constant BPS_DENOMINATOR = 10_000;
    uint256 public constant SECONDS_PER_YEAR = 365 days;

    enum LoanStatus { None, Pending, Active, Repaid, Rejected }

    struct LoanRequest {
        uint256 amount;
        ebool encEligible;
        euint64 encRate;
        LoanStatus status;
    }

    struct Loan {
        uint256 principal;
        uint256 rateBps;
        uint256 startTime;
        uint256 maxRepayment;
    }

    ICreditEngine public immutable creditEngine;

    address public owner;
    address public relayer;

    mapping(address => LoanRequest) private _requests;
    mapping(address => Loan) private _loans;
    mapping(address => LoanStatus) public loanStatus;

    uint256 public totalDeposits;
    uint256 public totalBorrowed;

    event LoanRequested(address indexed borrower, uint256 amount);
    event LoanIssued(address indexed borrower, uint256 principal, uint256 rateBps);
    event LoanRejected(address indexed borrower);
    event LoanRepaid(address indexed borrower, uint256 totalPaid);
    event PoolDeposit(address indexed depositor, uint256 amount);
    event PoolWithdrawal(address indexed to, uint256 amount);
    event RelayerSet(address indexed relayer);

    modifier onlyOwner() {
        require(msg.sender == owner, "LendingPool: caller is not owner");
        _;
    }

    modifier onlyRelayer() {
        require(msg.sender == relayer, "LendingPool: caller is not relayer");
        _;
    }

    constructor(address engineAddr) {
        require(engineAddr != address(0), "LendingPool: zero engine address");
        owner = msg.sender;
        relayer = msg.sender;
        creditEngine = ICreditEngine(engineAddr);
    }

    function setRelayer(address _relayer) external onlyOwner {
        require(_relayer != address(0), "LendingPool: zero address");
        relayer = _relayer;
        emit RelayerSet(_relayer);
    }

    function deposit() external payable {
        require(msg.value > 0, "LendingPool: zero deposit");
        totalDeposits += msg.value;
        emit PoolDeposit(msg.sender, msg.value);
    }

    function withdraw(uint256 amount) external onlyOwner {
        uint256 available = address(this).balance;
        require(amount <= available, "LendingPool: insufficient balance");
        totalDeposits -= amount;
        payable(owner).transfer(amount);
        emit PoolWithdrawal(owner, amount);
    }

    function requestLoan(uint256 amount) external {
        require(amount > 0, "LendingPool: zero borrow amount");
        require(creditEngine.hasScore(msg.sender), "LendingPool: no credit score");
        require(
            loanStatus[msg.sender] != LoanStatus.Pending,
            "LendingPool: request already pending"
        );
        require(
            loanStatus[msg.sender] != LoanStatus.Active,
            "LendingPool: existing loan active"
        );

        euint64 encScore = creditEngine.getScore(msg.sender);

        // Encrypted threshold comparisons
        euint64 threshold700 = FHE.asEuint64(uint64(700));
        euint64 threshold500 = FHE.asEuint64(uint64(500));

        ebool isHighTier = FHE.ge(encScore, threshold700);
        ebool isMidTier = FHE.ge(encScore, threshold500);

        ebool isEligible = FHE.or(isHighTier, isMidTier);

        // Encrypted rate selection
        euint64 rateA = FHE.asEuint64(TIER_A_RATE_BPS);
        euint64 rateB = FHE.asEuint64(TIER_B_RATE_BPS);
        euint64 rateZero = FHE.asEuint64(uint64(0));

        euint64 encRate = FHE.select(
            isHighTier,
            rateA,
            FHE.select(isMidTier, rateB, rateZero)
        );

        _requests[msg.sender] = LoanRequest({
            amount: amount,
            encEligible: isEligible,
            encRate: encRate,
            status: LoanStatus.Pending
        });

        loanStatus[msg.sender] = LoanStatus.Pending;

        FHE.allowThis(isEligible);
        FHE.allowThis(encRate);

        FHE.allow(isEligible, msg.sender);
        FHE.allow(encRate, msg.sender);

        // Request async decryption via the oracle
        bytes32[] memory cts = new bytes32[](2);
        cts[0] = ebool.unwrap(isEligible);
        cts[1] = euint64.unwrap(encRate);
        FHE.requestDecryption(cts, this.fulfillLoanCallback.selector);

        emit LoanRequested(msg.sender, amount);
    }

    /// @notice Oracle callback after decryption completes.
    function fulfillLoanCallback(uint256 /* requestID */, bytes calldata decryptedData) external {
        // In production, verify caller is the oracle. For demo, accept any caller.
    }

    function fulfillLoan(
        address borrower,
        bool eligible,
        uint256 rateBps
    ) external onlyRelayer {
        require(
            loanStatus[borrower] == LoanStatus.Pending,
            "LendingPool: no pending request"
        );

        LoanRequest storage req = _requests[borrower];

        if (!eligible) {
            req.status = LoanStatus.Rejected;
            loanStatus[borrower] = LoanStatus.Rejected;
            emit LoanRejected(borrower);
            return;
        }

        uint256 amt = req.amount;

        uint256 maxLoan = rateBps == uint256(TIER_A_RATE_BPS) ? TIER_A_MAX_LOAN : TIER_B_MAX_LOAN;
        if (amt > maxLoan) {
            amt = maxLoan;
        }

        require(
            address(this).balance >= amt,
            "LendingPool: insufficient pool liquidity"
        );

        _loans[borrower] = Loan({
            principal: amt,
            rateBps: rateBps,
            startTime: block.timestamp,
            maxRepayment: 0
        });

        req.status = LoanStatus.Active;
        loanStatus[borrower] = LoanStatus.Active;
        totalBorrowed += amt;

        payable(borrower).transfer(amt);

        emit LoanIssued(borrower, amt, rateBps);
    }

    function repay() external payable {
        require(
            loanStatus[msg.sender] == LoanStatus.Active,
            "LendingPool: no active loan"
        );

        Loan storage loan = _loans[msg.sender];
        uint256 owed = _calculateRepayment(loan);

        require(msg.value >= owed, "LendingPool: insufficient repayment");

        loanStatus[msg.sender] = LoanStatus.Repaid;
        totalBorrowed -= loan.principal;

        uint256 refund = msg.value - owed;
        if (refund > 0) {
            payable(msg.sender).transfer(refund);
        }

        emit LoanRepaid(msg.sender, owed);
    }

    function getRepaymentAmount(address borrower) external view returns (uint256) {
        require(
            loanStatus[borrower] == LoanStatus.Active,
            "LendingPool: no active loan"
        );
        return _calculateRepayment(_loans[borrower]);
    }

    function getLoanDetails(address borrower)
        external
        view
        returns (uint256 principal, uint256 rateBps, uint256 startTime, LoanStatus status)
    {
        Loan storage loan = _loans[borrower];
        return (loan.principal, loan.rateBps, loan.startTime, loanStatus[borrower]);
    }

    function availableLiquidity() external view returns (uint256) {
        return address(this).balance;
    }

    function _calculateRepayment(Loan storage loan) internal view returns (uint256) {
        uint256 elapsed = block.timestamp - loan.startTime;
        uint256 interest = (loan.principal * loan.rateBps * elapsed) /
            (BPS_DENOMINATOR * SECONDS_PER_YEAR);
        return loan.principal + interest;
    }

    receive() external payable {
        totalDeposits += msg.value;
        emit PoolDeposit(msg.sender, msg.value);
    }
}
