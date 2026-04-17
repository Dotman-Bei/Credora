// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { euint64 } from "@fhevm/solidity/lib/FHE.sol";

/// @title IEncryptedProfile
/// @notice Interface for reading encrypted user financial profiles.
interface IEncryptedProfile {
    /// @notice Returns the encrypted financial fields for a user.
    /// @dev Caller must have ACL access to each returned handle.
    function getProfile(address user)
        external
        view
        returns (euint64 income, euint64 assets, euint64 liabilities);

    /// @notice Checks whether a user has submitted a profile.
    function hasProfile(address user) external view returns (bool);
}
