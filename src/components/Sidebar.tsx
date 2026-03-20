"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import styles from './Sidebar.module.css';
import { useAuth } from '@/context/AuthContext';
import ProfileModal from './ProfileModal';

// Define User Roles
type UserRole = 'Admin' | 'Section Chief' | 'Unit Head' | 'Planning Unit Head' | 'Planning Engineer' | 'Unit Member' | 'Regular Member' | 'Cost Estimator' | 'Project Programmer' | 'User';

export default function Sidebar({ isCollapsed = false, toggleSidebar }: { isCollapsed?: boolean; toggleSidebar?: () => void }) {
  const pathname = usePathname();
  const { profile, loading: authLoading, signOut } = useAuth();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  
  const userRole = (profile?.position || '') as UserRole | '';
  const userRestrictions = (profile as any)?.restrictions || [];
  const userName = profile?.name || '';
  const isLoaded = !authLoading && !!profile;
  const isWorkspaceUser = userRole === 'Unit Member' || userRole === 'Regular Member' || userRole === 'Planning Engineer';

  const activeStage: 'RBP' | 'NEP' | 'GAA' | 'ADMIN' = pathname.includes('/gaa') ? 'GAA' : pathname.includes('/nep') ? 'NEP' : (pathname.includes('/team') || pathname.includes('/settings')) ? 'ADMIN' : 'RBP';

  const getOverviewHref = () => {
    switch (userRole) {
      case 'Section Chief':
        return '/dashboard/rbp-progress';
      case 'Unit Head':
        return '/dashboard/unit-head-task';
      case 'Planning Unit Head':
      case 'Planning Engineer':
        return '/dashboard/planning-member-task';
      case 'Unit Member':
      default:
        return '/dashboard/user-task';
    }
  };

  const overviewHref = getOverviewHref();

  // Navigation Items with Role Permissions
  const navConfig = {
    RBP: {
      color: 'var(--dpwh-blue)', // DPWH Navy Blue
      label: 'Regional Budget Proposal',
      items: [
        {
          category: 'Dashboards & Analytics',
          name: 'Overall Progress',
          href: '/dashboard/rbp-progress',
          icon: 'analytics',
          roles: ['Section Chief', 'Planning Unit Head']
        },
        {
          category: 'Dashboards & Analytics',
          name: 'Division Performance Metrics',
          href: '/dashboard/rbp/performance',
          icon: 'speed',
          roles: ['Section Chief']
        },
        {
          category: 'Dashboards & Analytics',
          name: 'Master List',
          href: '/dashboard/rbp/master-list',
          icon: 'database',
          roles: ['Section Chief', 'Planning Unit Head']
        },
        {
          category: 'Dashboards & Analytics',
          name: 'Reports',
          href: '/dashboard/rbp/reports',
          icon: 'print',
          roles: ['Section Chief', 'Planning Unit Head']
        },
        {
          category: 'Operations & Data',
          name: 'Project Detail Entry',
          href: '/dashboard/rbp',
          icon: 'inventory_2',
          roles: ['Planning Unit Head']
        },
        {
          category: 'Operations & Data',
          name: 'Global Task List',
          href: '/dashboard/rbp/global-tasks',
          icon: 'list_alt',
          roles: ['Section Chief', 'Planning Unit Head']
        },
        {
          category: 'Operations & Data',
          name: 'Missing Documents Tracker',
          href: '/dashboard/rbp/missing-docs',
          icon: 'find_in_page',
          roles: ['Planning Unit Head']
        },
        {
          category: 'Operations & Data',
          name: 'Task Delegation',
          href: '/dashboard/rbp/delegation',
          icon: 'assignment_ind',
          roles: ['Planning Unit Head']
        },
        {
          category: 'Operations & Data',
          name: 'Unit Member Activity',
          href: '/dashboard/rbp/unit-activity',
          icon: 'recent_actors',
          roles: ['Unit Head']
        },
        {
          category: 'Reviews & Approvals',
          name: 'Technical Review Queue',
          href: '/dashboard/rbp/review',
          icon: 'assignment_turned_in',
          roles: ['Section Chief', 'Unit Head']
        },
        {
          category: 'Reviews & Approvals',
          name: 'Returned / Needs Revision Log',
          href: '/dashboard/rbp/returned-log',
          icon: 'assignment_return',
          roles: ['Unit Head']
        },
        {
          category: 'Reviews & Approvals',
          name: 'Final Approvals',
          href: '/dashboard/approval',
          icon: 'approval',
          roles: ['Section Chief']
        },
        {
          category: 'Reviews & Approvals',
          name: 'Memorandums',
          href: '/dashboard/memorandums',
          icon: 'description',
          roles: ['Section Chief']
        },
        {
          category: 'My Workspace',
          name: 'My Tasks',
          href: '/dashboard/planning-member-task',
          icon: 'task_alt',
          roles: ['Planning Engineer', 'Planning Unit Head']
        },
      ]
    },
    NEP: {
      color: 'var(--dpwh-green, #10b981)', // Tailwind Emerald 500 equivalent color
      label: 'National Expenditure Program',
      items: [
        {
          category: 'Dashboards & Analytics',
          name: 'NEP Dashboard',
          href: '/dashboard/nep',
          icon: 'dashboard',
          roles: ['Section Chief', 'Planning Unit Head', 'Unit Head']
        },
        {
          category: 'Dashboards & Analytics',
          name: 'Division Performance Metrics',
          href: '/dashboard/nep/performance',
          icon: 'speed',
          roles: ['Section Chief']
        },
        {
          category: 'Dashboards & Analytics',
          name: 'Reports',
          href: '/dashboard/nep/reports',
          icon: 'print',
          roles: ['Section Chief', 'Planning Unit Head']
        },
        {
          category: 'Operations & Data',
          name: 'All NEP Projects',
          href: '/dashboard/nep/projects',
          icon: 'list_alt',
          roles: ['Section Chief', 'Planning Unit Head', 'Unit Head', 'Planning Engineer', 'Unit Member']
        },
        {
          category: 'Operations & Data',
          name: 'Global Task List',
          href: '/dashboard/nep/global-tasks',
          icon: 'list_alt',
          roles: ['Section Chief', 'Planning Unit Head']
        },
        {
          category: 'Operations & Data',
          name: 'Missing Documents Tracker',
          href: '/dashboard/nep/missing-docs',
          icon: 'find_in_page',
          roles: ['Planning Unit Head']
        },
        {
          category: 'Operations & Data',
          name: 'Task Delegation',
          href: '/dashboard/nep/delegation',
          icon: 'assignment_ind',
          roles: ['Planning Unit Head']
        },
        {
          category: 'Operations & Data',
          name: 'Document Tracking',
          href: '/dashboard/nep/documents',
          icon: 'folder_open',
          roles: ['Section Chief', 'Unit Head', 'Planning Engineer']
        },
        {
          category: 'Operations & Data',
          name: 'Unit Member Activity',
          href: '/dashboard/nep/unit-activity',
          icon: 'recent_actors',
          roles: ['Unit Head']
        },
        {
          category: 'Reviews & Approvals',
          name: 'Technical Review Queue',
          href: '/dashboard/nep/review',
          icon: 'assignment_turned_in',
          roles: ['Section Chief', 'Unit Head']
        },
        {
          category: 'Reviews & Approvals',
          name: 'Returned / Needs Revision Log',
          href: '/dashboard/nep/returned-log',
          icon: 'assignment_return',
          roles: ['Unit Head']
        },
        {
          category: 'Reviews & Approvals',
          name: 'Final Approvals',
          href: '/dashboard/nep/approval',
          icon: 'approval',
          roles: ['Section Chief']
        },
        {
          category: 'Phase Operations',
          name: 'Migrate from RBP',
          href: '/dashboard/nep/migrate',
          icon: 'move_up',
          roles: ['Section Chief', 'Planning Unit Head']
        },
      ]
    },
    GAA: {
      color: 'var(--dpwh-orange)', // DPWH Orange
      label: 'General Appropriations Act',
      items: [
        {
          category: 'Dashboards & Analytics',
          name: 'GAA Dashboard',
          href: '/dashboard/gaa',
          icon: 'dashboard',
          roles: ['Section Chief', 'Unit Head', 'Planning Unit Head', 'Unit Member', 'Regular Member']
        },
        {
          category: 'Dashboards & Analytics',
          name: 'Division Performance Metrics',
          href: '/dashboard/gaa/performance',
          icon: 'speed',
          roles: ['Section Chief']
        },
        {
          category: 'Dashboards & Analytics',
          name: 'Reports',
          href: '/dashboard/gaa/reports',
          icon: 'print',
          roles: ['Section Chief', 'Planning Unit Head']
        },
        {
          category: 'Operations & Data',
          name: 'All GAA Projects',
          href: '/dashboard/gaa/projects',
          icon: 'list_alt',
          roles: ['Section Chief', 'Planning Unit Head', 'Unit Head', 'Planning Engineer', 'Unit Member']
        },
        {
          category: 'Operations & Data',
          name: 'Global Task List',
          href: '/dashboard/gaa/global-tasks',
          icon: 'list_alt',
          roles: ['Section Chief', 'Planning Unit Head']
        },
        {
          category: 'Operations & Data',
          name: 'Missing Documents Tracker',
          href: '/dashboard/gaa/missing-docs',
          icon: 'find_in_page',
          roles: ['Planning Unit Head']
        },
        {
          category: 'Operations & Data',
          name: 'Task Delegation',
          href: '/dashboard/gaa/delegation',
          icon: 'assignment_ind',
          roles: ['Planning Unit Head']
        },
        {
          category: 'Operations & Data',
          name: 'Document Tracking',
          href: '/dashboard/gaa/documents',
          icon: 'folder_open',
          roles: ['Section Chief', 'Unit Head', 'Planning Engineer']
        },
        {
          category: 'Operations & Data',
          name: 'Unit Member Activity',
          href: '/dashboard/gaa/unit-activity',
          icon: 'recent_actors',
          roles: ['Unit Head']
        },
        {
          category: 'Execution & Updates',
          name: 'Physical Progress',
          href: '/dashboard/gaa/progress',
          icon: 'bar_chart',
          roles: ['Section Chief', 'Unit Head', 'Unit Member', 'Regular Member']
        },
        {
          category: 'Reviews & Approvals',
          name: 'Technical Review Queue',
          href: '/dashboard/gaa/review',
          icon: 'assignment_turned_in',
          roles: ['Section Chief', 'Unit Head']
        },
        {
          category: 'Reviews & Approvals',
          name: 'Returned / Needs Revision Log',
          href: '/dashboard/gaa/returned-log',
          icon: 'assignment_return',
          roles: ['Unit Head']
        },
        {
          category: 'Reviews & Approvals',
          name: 'Final Approvals',
          href: '/dashboard/gaa/approval',
          icon: 'approval',
          roles: ['Section Chief']
        },
        {
          category: 'Phase Operations',
          name: 'Migrate from NEP',
          href: '/dashboard/gaa/migrate',
          icon: 'move_up',
          roles: ['Section Chief', 'Planning Unit Head']
        },
      ]
    },
    ADMIN: {
      color: 'var(--dpwh-blue)',
      label: 'System Administration',
      items: [
        {
          name: 'Team & Permissions',
          href: '/dashboard/team',
          icon: 'groups',
          roles: ['Admin', 'Section Chief']
        },
        {
          name: 'Settings',
          href: '/dashboard/settings',
          icon: 'settings',
          roles: ['Admin']
        }
      ]
    }
  };

  const adminItems = [
    { name: 'Team & Permissions', href: '/dashboard/team', icon: 'groups', roles: ['Admin', 'Section Chief'] },
  ];

  const filteredItems = isLoaded ? navConfig[activeStage].items.filter(item => {
    if (!item.roles.includes(userRole as any)) return false;

    return true;
  }) : [];

  const filteredAdminItems = isLoaded ? adminItems.filter(item =>
    item.roles.includes(userRole as any)
  ) : [];

  const isMostSpecificMatch = (href: string) => {
    if (pathname === href) return true;
    if (href !== '/dashboard' && pathname.startsWith(`${href}/`)) {
      // Check if there's a longer, more specific matching href in our nav items
      const hasLongerMatch = filteredItems.some(
        (i) => i.href !== href && i.href.length > href.length && (pathname === i.href || pathname.startsWith(`${i.href}/`))
      );
      return !hasLongerMatch;
    }
    return false;
  };

  const renderLink = (item: { name: string; href: string; icon: string }) => {
    const isActive = isMostSpecificMatch(item.href);
    const activeColor = activeStage === 'RBP' ? 'var(--dpwh-blue)' : activeStage === 'GAA' ? 'var(--dpwh-orange)' : '#4b5563';

    const itemStyle = isActive ? { backgroundColor: activeColor, borderColor: 'rgba(255,255,255,0.2)' } : {};

    return (
      <Link
        key={item.href}
        href={item.href}
        className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
        style={itemStyle}
      >
        <div className={styles.navItemIconBox}>
          <span className={`material-symbols-outlined ${styles.navItemIcon}`}>{item.icon}</span>
        </div>
        {!isCollapsed && <span>{item.name}</span>}
      </Link>
    );
  };

  return (
    <aside className={`${styles.sidebar} ${isCollapsed ? styles.sidebarCollapsed : ''}`}>

      {/* Brand area */}
      <div className={styles.brand}>
        {!isCollapsed && (
          <>
            <h1 className={styles.brandTitle}>
              DPWH <span className={styles.brandTitleHighlight}>TASK</span>
            </h1>
            <p className={styles.brandSubtitle}>Management System</p>
          </>
        )}
        {toggleSidebar && (
          <button onClick={toggleSidebar} className={styles.toggleBtn} aria-label="Toggle Sidebar">
            <span className="material-symbols-outlined">{isCollapsed ? 'menu' : 'menu_open'}</span>
          </button>
        )}
      </div>

      {/* Stage Selection */}
      {!isWorkspaceUser && (
      <div className={styles.moduleSelect}>
        {!isCollapsed && <p className={styles.moduleLabel}>Select Module</p>}
        <div className={styles.moduleGrid} style={isCollapsed ? { flexDirection: 'column' } : {}}>
          <Link
            href="/dashboard/rbp"
            className={`${styles.moduleBtn} ${activeStage === 'RBP' ? styles.moduleBtnActiveRBP : ''}`}
            title="Regional Budget Proposal"
          >
            {isCollapsed ? <span className={`material-symbols-outlined ${styles.moduleIcon}`}>account_balance_wallet</span> : <span className={styles.moduleText}>RBP</span>}
          </Link>
          <Link
            href="/dashboard/nep"
            className={`${styles.moduleBtn} ${activeStage === 'NEP' ? styles.moduleBtnActiveGAA : ''}`}
            title="National Expenditure Program"
          >
            {isCollapsed ? <span className={`material-symbols-outlined ${styles.moduleIcon}`}>folder_shared</span> : <span className={styles.moduleText}>NEP</span>}
          </Link>
          <Link
            href="/dashboard/gaa"
            className={`${styles.moduleBtn} ${activeStage === 'GAA' ? styles.moduleBtnActiveGAA : ''}`}
            title="Project Implementation"
          >
            {isCollapsed ? <span className={`material-symbols-outlined ${styles.moduleIcon}`}>analytics</span> : <span className={styles.moduleText}>GAA</span>}
          </Link>
          {userRole === 'Admin' && (
            <Link
              href="/dashboard/team"
              className={`${styles.moduleBtn} ${activeStage === 'ADMIN' ? styles.moduleBtnActiveRBP : ''}`}
              style={activeStage === 'ADMIN' ? { backgroundColor: 'var(--dpwh-blue)', color: 'white' } : {}}
              title="Administration"
            >
              {isCollapsed ? <span className={`material-symbols-outlined ${styles.moduleIcon}`}>admin_panel_settings</span> : <span className={styles.moduleText}>ADMIN</span>}
            </Link>
          )}
        </div>
      </div>
      )}

      {/* Navigation Links */}
      <nav className={styles.nav}>

        <div className={styles.navSection}>
          <Link
            href={overviewHref}
            className={`${styles.navItem} ${pathname === overviewHref ? styles.navItemActive : ''}`}
            style={pathname === overviewHref ? { backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)' } : {}}
            title="Overview Dashboard"
          >
            <div className={styles.navItemIconBox}>
              <span className={`material-symbols-outlined ${styles.navItemIcon}`}>dashboard</span>
            </div>
            {!isCollapsed && <span>{isWorkspaceUser ? 'My Workspace Overview' : 'Overview Dashboard'}</span>}
          </Link>
        </div>

        {isWorkspaceUser ? (
          <div className={styles.navSection}>
            {!isCollapsed && (
              <div className={styles.navSectionHeader}>
                <div className={styles.navDot} style={{ backgroundColor: '#3b82f6' }}></div>
                <p className={styles.navSectionLabel}>My Workspace</p>
              </div>
            )}
            {!isCollapsed && <p className={styles.navCategoryHeader}>Projects</p>}
            {renderLink({ name: 'Project List (RBP)', href: '/dashboard/rbp', icon: 'account_balance_wallet' })}
            {renderLink({ name: 'Project List (NEP)', href: '/dashboard/nep/projects', icon: 'folder_shared' })}
            {renderLink({ name: 'Project List (GAA)', href: '/dashboard/gaa/projects', icon: 'analytics' })}
            {!isCollapsed && <p className={styles.navCategoryHeader}>Execution & Updates</p>}
            {renderLink({ name: 'Physical Progress', href: '/dashboard/gaa/progress', icon: 'bar_chart' })}
            {renderLink({ name: 'My Uploads / Documents', href: '/dashboard/my-uploads', icon: 'folder_open' })}
          </div>
        ) : filteredItems.length > 0 && (
          <div className={styles.navSection}>
            {!isCollapsed && (
              <div className={styles.navSectionHeader}>
                <div className={styles.navDot} style={{ backgroundColor: navConfig[activeStage].color }}></div>
                <p className={styles.navSectionLabel}>{navConfig[activeStage].label}</p>
              </div>
            )}
            {(() => {
              let currentCat = '';
              return filteredItems.map((item) => {
                const isNewCat = (item as any).category && (item as any).category !== currentCat;
                if (isNewCat) currentCat = (item as any).category;

                return (
                  <React.Fragment key={item.href}>
                    {isNewCat && !isCollapsed && (
                      <p className={styles.navCategoryHeader}>{(item as any).category}</p>
                    )}
                    {renderLink(item as any)}
                  </React.Fragment>
                );
              });
            })()}
          </div>
        )}

        {filteredAdminItems.length > 0 && (
          <div className={styles.navSection}>
            {!isCollapsed && <p className={styles.navSectionLabel} style={{ marginLeft: '0.5rem', marginBottom: '0.5rem' }}>Administration</p>}
            {filteredAdminItems.map(renderLink)}
          </div>
        )}
      </nav>

      {/* Role Emulator & Footer */}
      <div className={styles.footer}>
        {!isCollapsed && (
          <div className={styles.roleBoxWrapper}>
            <div className={styles.roleBox} onClick={() => setIsProfileModalOpen(true)}>
              <div className={styles.roleAvatar}>
                {authLoading ? '..' : 
                 (profile?.avatar_url ? 
                    <img src={profile.avatar_url} alt="Profile" className={styles.roleAvatarImage} /> 
                  : (userName ? userName.split(' ').map(n => n[0]).join('') : '??'))}
              </div>
              <div className={styles.roleInfo}>
                <p className={styles.roleName}>{authLoading ? 'Verifying...' : (userName || 'Unknown User')}</p>
                <p className={styles.roleTitle}>{authLoading ? 'Please wait' : (userRole || 'Guest')}</p>
                <div style={{ fontSize: '0.625rem', color: '#1152d4', marginTop: '0.125rem', fontWeight: 600 }}>Account Settings</div>
              </div>
            </div>
          </div>
        )}

        {/* Status Bar Section */}
        <div className={styles.statusBar} style={isCollapsed ? { padding: '1.25rem 0.5rem', alignItems: 'center' } : {}}>
          {!isCollapsed && (
            <div className={styles.statusRow}>
              <div className={styles.statusItem}>
                <span className={styles.pulse}></span>
                <span>System Online</span>
              </div>
              <div className={styles.statusItem}>
                <span className={`material-symbols-outlined ${styles.statusIcon}`}>verified_user</span>
                <span>Secure</span>
              </div>
            </div>
          )}

          <div className={styles.bottomRow} style={isCollapsed ? { flexDirection: 'column', width: '100%' } : {}}>
            <button
              className={styles.btnLogout}
              onClick={signOut}
              title="Logout"
            >
              <span className={`material-symbols-outlined ${styles.btnLogoutIcon}`}>logout</span>
              {!isCollapsed && 'Logout'}
            </button>
            {!isCollapsed && (
              <div className={styles.versionBadge}>
                1.0
              </div>
            )}
          </div>
        </div>
      </div>

      <ProfileModal 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
        onUploadSuccess={() => window.location.reload()}
      />
    </aside>
  );
}
