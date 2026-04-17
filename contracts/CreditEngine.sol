// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { FHE, euint64, ebool } from "@fhevm/solidity/lib/FHE.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/ZamaConfig.sol";
import { IEncryptedProfile } from "./interfaces/IEncryptedProfile.sol";
import { ICreditEngine } from "./interfaces/ICreditEngine.sol";

/// @title CreditEngine
/// @author Credora Protocol
/// @notice Computes an encrypted credit score from a user's encrypted financial profile.
contract CreditEngine is SepoliaConfig, ICreditEngine {
    IEncryptedProfile public immutable profileContract;

    address public owner;
    address public lendingPool;

    mapping(address => euint64) private _scores;
    mapping(address => bool) private _hasScore;

    event ScoreComputed(address indexed user);
    event LendingPoolSet(address indexed pool);

    modifier onlyOwner() {
        require(msg.sender == owner, "CreditEngine: caller is not owner");
        _;
    }

    constructor(address profileAddr) {
        require(profileAddr != address(0), "CreditEngine: zero profile address");
        owner = msg.sender;
        profileContract = IEncryptedProfile(profileAddr);
    }

    function _addIfGte(euint64 score, euint64 value, uint64 threshold, uint64 points) internal returns (euint64) {
        ebool meetsThreshold = FHE.ge(value, FHE.asEuint64(threshold));
        euint64 bonus = FHE.select(
            meetsThreshold,
            FHE.asEuint64(points),
            FHE.asEuint64(uint64(0))
        );
        return FHE.add(score, bonus);
    }

    function _subtractIfGte(euint64 score, euint64 value, uint64 threshold, uint64 points) internal returns (euint64) {
        ebool meetsThreshold = FHE.ge(value, FHE.asEuint64(threshold));
        euint64 penalty = FHE.select(
            meetsThreshold,
            FHE.asEuint64(points),
            FHE.asEuint64(uint64(0))
        );
        return FHE.sub(score, penalty);
    }

    function _addIfGteEncrypted(euint64 score, euint64 value, euint64 threshold, uint64 points) internal returns (euint64) {
        ebool meetsThreshold = FHE.ge(value, threshold);
        euint64 bonus = FHE.select(
            meetsThreshold,
            FHE.asEuint64(points),
            FHE.asEuint64(uint64(0))
        );
        return FHE.add(score, bonus);
    }

    function setLendingPool(address pool) external onlyOwner {
        require(pool != address(0), "CreditEngine: zero address");
        lendingPool = pool;
        emit LendingPoolSet(pool);
    }

    function computeScore(address user) external {
        require(profileContract.hasProfile(user), "CreditEngine: no profile for user");

        (euint64 income, euint64 assets, euint64 liabilities) = profileContract.getProfile(user);

        // Normalize the score so realistic USD profile inputs produce a spread of
        // values across the 300-850 band instead of snapping to the extremes.
        euint64 score = FHE.asEuint64(uint64(300));

        // Income bonuses
        score = _addIfGte(score, income, 2_000, 40);
        score = _addIfGte(score, income, 4_000, 50);
        score = _addIfGte(score, income, 6_000, 60);
        score = _addIfGte(score, income, 8_000, 50);
        score = _addIfGte(score, income, 12_000, 30);
        score = _addIfGte(score, income, 20_000, 20);

        // Asset bonuses
        score = _addIfGte(score, assets, 5_000, 30);
        score = _addIfGte(score, assets, 10_000, 40);
        score = _addIfGte(score, assets, 20_000, 50);
        score = _addIfGte(score, assets, 40_000, 45);
        score = _addIfGte(score, assets, 80_000, 35);

        // Liability penalties
        score = _subtractIfGte(score, liabilities, 2_000, 20);
        score = _subtractIfGte(score, liabilities, 5_000, 35);
        score = _subtractIfGte(score, liabilities, 10_000, 45);
        score = _subtractIfGte(score, liabilities, 20_000, 55);
        score = _subtractIfGte(score, liabilities, 40_000, 65);

        // Additional bonus when assets materially exceed liabilities.
        score = _addIfGteEncrypted(score, assets, FHE.add(liabilities, FHE.asEuint64(uint64(5_000))), 20);
        score = _addIfGteEncrypted(score, assets, FHE.add(liabilities, FHE.asEuint64(uint64(15_000))), 35);
        score = _addIfGteEncrypted(score, assets, FHE.add(liabilities, FHE.asEuint64(uint64(30_000))), 45);

        // Clamp to [300, 850]
        euint64 floor = FHE.asEuint64(uint64(300));
        euint64 ceiling = FHE.asEuint64(uint64(850));

        ebool belowFloor = FHE.lt(score, floor);
        euint64 clampedLow = FHE.select(belowFloor, floor, score);

        ebool aboveCeiling = FHE.gt(clampedLow, ceiling);
        euint64 finalScore = FHE.select(aboveCeiling, ceiling, clampedLow);

        // Store and grant ACL
        _scores[user] = finalScore;
        _hasScore[user] = true;

        FHE.allowThis(finalScore);
        FHE.allow(finalScore, user);

        if (lendingPool != address(0)) {
            FHE.allow(finalScore, lendingPool);
        }

        emit ScoreComputed(user);
    }

    function grantPoolAccess() external {
        require(_hasScore[msg.sender], "CreditEngine: no score computed");
        require(lendingPool != address(0), "CreditEngine: pool not set");
        FHE.allow(_scores[msg.sender], lendingPool);
    }

    /// @inheritdoc ICreditEngine
    function getScore(address user) external view override returns (euint64) {
        require(_hasScore[user], "CreditEngine: score not computed");
        return _scores[user];
    }

    /// @inheritdoc ICreditEngine
    function hasScore(address user) external view override returns (bool) {
        return _hasScore[user];
    }
}
