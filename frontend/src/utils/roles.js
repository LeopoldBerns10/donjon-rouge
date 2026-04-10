// Traduction des rôles CoC
export const COC_ROLE_LABELS = {
  leader:   'Chef',
  coLeader: 'Chef Adjoint',
  admin:    'Aîné',
  member:   'Membre',
}

export const formatCocRole = (role) => {
  return COC_ROLE_LABELS[role] || role || 'Membre'
}

// Traduction des rôles site
export const SITE_ROLE_LABELS = {
  superadmin: 'Super Admin',
  admin:      'Administrateur',
  member:     'Membre',
}

export const formatSiteRole = (role) => {
  return SITE_ROLE_LABELS[role] || 'Membre'
}
