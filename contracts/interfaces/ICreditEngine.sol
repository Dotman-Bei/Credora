// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import { euint64 } from "@fhevm/solidity/lib/FHE.sol";

/// @title ICreditEngine
/// @notice Interface for reading encrypted credit scores.
interface ICreditEngine {
    /// @notice Returns the encrypted credit score handle for a user.
    /// @dev Caller must have ACL access to the returned handle.
    function getScore(address user) external view returns (euint64);

    /// @notice Checks whether a score has been computed for a user.
    function hasScore(address user) external view returns (bool);
}
