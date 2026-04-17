// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { FHE, euint64, externalEuint64 } from "@fhevm/solidity/lib/FHE.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/ZamaConfig.sol";
import { IEncryptedProfile } from "./interfaces/IEncryptedProfile.sol";

/// @title EncryptedProfile
/// @author Credora Protocol
/// @notice Stores encrypted financial data (income, assets, liabilities) for each user.
///         Raw values NEVER appear on-chain — only FHE ciphertext handles are stored.
///
/// @dev Architecture notes:
///  - Each financial field is an `euint64` (bytes32 handle pointing to off-chain ciphertext).
///  - A single `inputProof` (attestation) covers all three encrypted inputs per submission,
///    because the frontend batches them into one `createEncryptedInput().add64().add64().add64()`.
///  - ACL grants are issued to: the contract itself (for reads), the user (for private decryption),
///    and the CreditEngine (for score computation).
///  - If the CreditEngine address is set AFTER a user submits, the user must call
///    `grantEngineAccess()` to retroactively grant the engine access to their data.
contract EncryptedProfile is SepoliaConfig, IEncryptedProfile {
    // ──────────────────────────────────────────────
    //  Types
    // ──────────────────────────────────────────────

    struct Profile {
        euint64 income;
        euint64 assets;
        euint64 liabilities;
        bool exists;
    }

    // ──────────────────────────────────────────────
    //  State
    // ──────────────────────────────────────────────

    mapping(address => Profile) private _profiles;

    address public owner;
    address public creditEngine;

    // ──────────────────────────────────────────────
    //  Events
    // ──────────────────────────────────────────────

    event ProfileSubmitted(address indexed user);
    event ProfileUpdated(address indexed user);
    event CreditEngineSet(address indexed engine);

    // ──────────────────────────────────────────────
    //  Modifiers
    // ──────────────────────────────────────────────

    modifier onlyOwner() {
        require(msg.sender == owner, "EncryptedProfile: caller is not owner");
        _;
    }

    // ──────────────────────────────────────────────
    //  Constructor
    // ──────────────────────────────────────────────

    constructor() {
        owner = msg.sender;
    }

    // ──────────────────────────────────────────────
    //  Admin
    // ──────────────────────────────────────────────

    /// @notice Sets the CreditEngine address that will be granted read access to profiles.
    /// @dev Must be called before users submit profiles. If called after, users need to
    ///      call `grantEngineAccess()` to retroactively grant the engine access.
    function setCreditEngine(address engine) external onlyOwner {
        require(engine != address(0), "EncryptedProfile: zero address");
        creditEngine = engine;
        emit CreditEngineSet(engine);
    }

    // ──────────────────────────────────────────────
    //  Profile Submission
    // ──────────────────────────────────────────────

    /// @notice Submit or update an encrypted financial profile (client-side encryption path).
    function submitProfile(
        externalEuint64 encIncome,
        externalEuint64 encAssets,
        externalEuint64 encLiabilities,
        bytes calldata inputProof
    ) external {
        euint64 income = FHE.fromExternal(encIncome, inputProof);
        euint64 assets = FHE.fromExternal(encAssets, inputProof);
        euint64 liabilities = FHE.fromExternal(encLiabilities, inputProof);
        _storeProfile(income, assets, liabilities);
    }

    /// @notice Submit or update with plaintext values — encrypted on-chain via FHE.asEuint64.
    /// @dev Values are only visible in the tx calldata; once encrypted, they are opaque on-chain.
    function submitProfilePlaintext(
        uint64 rawIncome,
        uint64 rawAssets,
        uint64 rawLiabilities
    ) external {
        euint64 income = FHE.asEuint64(rawIncome);
        euint64 assets = FHE.asEuint64(rawAssets);
        euint64 liabilities = FHE.asEuint64(rawLiabilities);
        _storeProfile(income, assets, liabilities);
    }

    /// @dev Internal: stores the encrypted profile and sets ACL grants.
    function _storeProfile(euint64 income, euint64 assets, euint64 liabilities) internal {
        bool isUpdate = _profiles[msg.sender].exists;

        _profiles[msg.sender] = Profile({
            income: income,
            assets: assets,
            liabilities: liabilities,
            exists: true
        });

        FHE.allowThis(income);
        FHE.allowThis(assets);
        FHE.allowThis(liabilities);

        FHE.allow(income, msg.sender);
        FHE.allow(assets, msg.sender);
        FHE.allow(liabilities, msg.sender);

        if (creditEngine != address(0)) {
            FHE.allow(income, creditEngine);
            FHE.allow(assets, creditEngine);
            FHE.allow(liabilities, creditEngine);
        }

        if (isUpdate) {
            emit ProfileUpdated(msg.sender);
        } else {
            emit ProfileSubmitted(msg.sender);
        }
    }

    // ──────────────────────────────────────────────
    //  ACL Management
    // ──────────────────────────────────────────────

    /// @notice Retroactively grants the CreditEngine access to the caller's encrypted profile.
    /// @dev Use this if the CreditEngine was set AFTER profile submission, or if the engine
    ///      address was changed.
    function grantEngineAccess() external {
        require(_profiles[msg.sender].exists, "EncryptedProfile: no profile");
        require(creditEngine != address(0), "EncryptedProfile: engine not set");

        FHE.allow(_profiles[msg.sender].income, creditEngine);
        FHE.allow(_profiles[msg.sender].assets, creditEngine);
        FHE.allow(_profiles[msg.sender].liabilities, creditEngine);
    }

    // ──────────────────────────────────────────────
    //  Reads
    // ──────────────────────────────────────────────

    /// @inheritdoc IEncryptedProfile
    function getProfile(address user)
        external
        view
        override
        returns (euint64 income, euint64 assets, euint64 liabilities)
    {
        require(_profiles[user].exists, "EncryptedProfile: profile not found");
        Profile storage p = _profiles[user];
        return (p.income, p.assets, p.liabilities);
    }

    /// @inheritdoc IEncryptedProfile
    function hasProfile(address user) external view override returns (bool) {
        return _profiles[user].exists;
    }
}
