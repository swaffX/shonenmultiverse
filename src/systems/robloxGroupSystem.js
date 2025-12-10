const axios = require('axios');
const config = require('../config/config');

// Roblox API Endpoints
const GROUPS_API = 'https://groups.roblox.com/v1';

/**
 * Get the X-CSRF-TOKEN (Required for POST requests)
 */
async function getCsrfToken(cookie) {
    try {
        await axios.post('https://auth.roblox.com/v2/logout', {}, {
            headers: { 'Cookie': `.ROBLOSECURITY=${cookie}` }
        });
    } catch (error) {
        if (error.response && error.response.headers['x-csrf-token']) {
            return error.response.headers['x-csrf-token'];
        }
    }
    return null;
}

/**
 * Change a user's rank in the group
 * @param {string} userId - Roblox User ID
 * @param {number} groupId - Roblox Group ID
 * @param {number} newRankId - The role/rank ID (1-255)
 */
async function setGroupRank(userId, groupId, newRankId) {
    const cookie = process.env.ROBLOSECURITY;
    if (!cookie) throw new Error('ROBLO_SECURITY cookie not configured.');

    const csrf = await getCsrfToken(cookie);
    if (!csrf) throw new Error('Failed to fetch X-CSRF-TOKEN');

    try {
        const response = await axios.patch(
            `${GROUPS_API}/groups/${groupId}/users/${userId}`,
            { roleId: newRankId },
            {
                headers: {
                    'Cookie': `.ROBLOSECURITY=${cookie}`,
                    'X-CSRF-TOKEN': csrf,
                    'Content-Type': 'application/json'
                }
            }
        );
        return response.data;
    } catch (error) {
        console.error('Set Rank Error:', error.response?.data || error.message);
        throw new Error(error.response?.data?.errors?.[0]?.message || 'Failed to change rank.');
    }
}

/**
 * Get all roles for a group
 */
async function getGroupRoles(groupId) {
    try {
        const response = await axios.get(`${GROUPS_API}/groups/${groupId}/roles`);
        return response.data.roles;
    } catch (error) {
        console.error('Get Roles Error:', error.message);
        return [];
    }
}

/**
 * Get a user's current rank in the group
 */
async function getUserGroupRank(userId, groupId) {
    try {
        const response = await axios.get(`${GROUPS_API}/users/${userId}/groups/roles`);
        const group = response.data.data.find(g => g.group.id.toString() === groupId.toString());
        return group ? group.role : null;
    } catch (error) {
        return null;
    }
}

module.exports = {
    setGroupRank,
    getGroupRoles,
    getUserGroupRank
};
