const { PermissionFlagsBits } = require('discord.js');
const config = require('../config/config');

// Check if user is bot owner
function isOwner(userId) {
    return config.ownerIds.includes(userId);
}

// Check if user has administrator permission
function isAdmin(member) {
    if (isOwner(member.id)) return true;
    return member.permissions.has(PermissionFlagsBits.Administrator);
}

// Check if user has moderator permissions
function isModerator(member) {
    if (isAdmin(member)) return true;

    return member.permissions.has(PermissionFlagsBits.ModerateMembers) ||
        member.permissions.has(PermissionFlagsBits.KickMembers) ||
        member.permissions.has(PermissionFlagsBits.BanMembers);
}

// Check if user can manage messages
function canManageMessages(member) {
    if (isAdmin(member)) return true;
    return member.permissions.has(PermissionFlagsBits.ManageMessages);
}

// Check if user can manage roles
function canManageRoles(member) {
    if (isAdmin(member)) return true;
    return member.permissions.has(PermissionFlagsBits.ManageRoles);
}

// Check if user can manage channels
function canManageChannels(member) {
    if (isAdmin(member)) return true;
    return member.permissions.has(PermissionFlagsBits.ManageChannels);
}

// Check if user can ban members
function canBan(member) {
    if (isAdmin(member)) return true;
    return member.permissions.has(PermissionFlagsBits.BanMembers);
}

// Check if user can kick members
function canKick(member) {
    if (isAdmin(member)) return true;
    return member.permissions.has(PermissionFlagsBits.KickMembers);
}

// Check if user can moderate (timeout)
function canModerate(member) {
    if (isAdmin(member)) return true;
    return member.permissions.has(PermissionFlagsBits.ModerateMembers);
}

// Check role hierarchy
function canModerateTarget(moderator, target) {
    // Owners can moderate anyone
    if (isOwner(moderator.id)) return true;

    // Can't moderate owners
    if (isOwner(target.id)) return false;

    // Can't moderate yourself
    if (moderator.id === target.id) return false;

    // Check role hierarchy
    return moderator.roles.highest.position > target.roles.highest.position;
}

// Get required permission message
function getPermissionError(permission) {
    const permissionNames = {
        'Administrator': 'Yönetici',
        'ModerateMembers': 'Üyeleri Yönet',
        'KickMembers': 'Üyeleri At',
        'BanMembers': 'Üyeleri Yasakla',
        'ManageMessages': 'Mesajları Yönet',
        'ManageRoles': 'Rolleri Yönet',
        'ManageChannels': 'Kanalları Yönet'
    };

    return `Bu komutu kullanmak için **${permissionNames[permission] || permission}** yetkisine ihtiyacınız var.`;
}

module.exports = {
    isOwner,
    isAdmin,
    isModerator,
    canManageMessages,
    canManageRoles,
    canManageChannels,
    canBan,
    canKick,
    canModerate,
    canModerateTarget,
    getPermissionError
};
