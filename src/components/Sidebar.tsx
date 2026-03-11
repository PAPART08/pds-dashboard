"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import styles from './Sidebar.module.css';

// Define User Roles
type UserRole = 'Admin' | 'Section Chief' | 'Unit Head' | 'Planning Unit' | 'Unit Member' | 'Regular Member' | 'Cost Estimator' | 'Project Programmer' | 'User';

export default function Sidebar({ isCollapsed = false, toggleSidebar }: { isCollapsed?: boolean; toggleSidebar?: () => void }) {
  const pathname = usePathname();
  const [userRole, setUserRole] = useState<UserRole | ''>('');
  const [userRestrictions, setUserRestrictions] = useState<string[]>([]);
  const [userName, setUserName] = useState<string>('');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      const role = parsedUser.role || parsedUser.position;
      if (role) {
        setUserRole(role as UserRole);
      }
      if (parsedUser.name) {
        setUserName(parsedUser.name);
      }
      if (parsedUser.restrictions) {
        setUserRestrictions(parsedUser.restrictions);
      }
    } else {
      // Fallback defaults for demo if no one is logged in
      setUserRole('Section Chief');
      setUserName('Carlos Santos');
    }
    setIsLoaded(true);
  }, []);

  const activeStage: 'RBP' | 'GAA' | 'ADMIN' = pathname.includes('/gaa') ? 'GAA' : (pathname.includes('/team') || pathname.includes('/settings')) ? 'ADMIN' : 'RBP';

  const getOverviewHref = () => {
    switch (userRole) {
      case 'Section Chief':
      case 'Planning Unit':
        return '/dashboard/rbp-progress';
      case 'Unit Head':
        return '/dashboard/unit-head-task';
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
          name: 'Overall Progress',
          href: '/dashboard/rbp-progress',
          icon: 'analytics',
          roles: ['Section Chief', 'Planning Unit']
        },
        {
          name: 'Project Detail Entry',
          href: '/dashboard/rbp',
          icon: 'inventory_2',
          roles: ['Section Chief', 'Planning Unit', 'Unit Head', 'Unit Member', 'Regular Member']
        },
        {
          name: 'Global Task List',
          href: '/dashboard/rbp/global-tasks',
          icon: 'list_alt',
          roles: ['Section Chief', 'Planning Unit', 'Unit Head']
        },
        {
          name: 'Master List',
          href: '/dashboard/rbp/master-list',
          icon: 'database',
          roles: ['Section Chief', 'Planning Unit']
        },
        {
          name: 'Technical Review Queue',
          href: '/dashboard/rbp/review',
          icon: 'assignment_turned_in',
          roles: ['Section Chief', 'Unit Head']
        },
        {
          name: 'Final Approvals',
          href: '/dashboard/approval',
          icon: 'approval',
          roles: ['Section Chief']
        },
      ]
    },
    GAA: {
      color: 'var(--dpwh-orange)', // DPWH Orange
      label: 'Project Implementation',
      items: [
        {
          name: 'GAA Overview',
          href: '/dashboard/gaa',
          icon: 'engineering',
          roles: ['Section Chief', 'Unit Head', 'Planning Unit', 'Unit Member', 'Regular Member']
        },
        {
          name: 'Financial Targets',
          href: '/dashboard/gaa/financials',
          icon: 'account_balance_wallet',
          roles: ['Section Chief', 'Planning Unit']
        },
        {
          name: 'Physical Progress',
          href: '/dashboard/gaa/progress',
          icon: 'bar_chart',
          roles: ['Section Chief', 'Unit Head', 'Unit Member', 'Regular Member']
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

    // Specifically filter Global Task List for Section Chief, it requires an Admin to manually toggle them
    if (item.href === '/dashboard/rbp/global-tasks') {
      if (userRole === 'Section Chief') {
        return true;
      }
    }
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
        <div className={styles.brandTop}>
          <div className={styles.brandIconBox}>
            <span className={`material-symbols-outlined ${styles.brandIcon}`}>engineering</span>
          </div>
          {!isCollapsed && (
            <h1 className={styles.brandTitle}>
              DPWH <span className={styles.brandTitleHighlight}>TASK</span>
            </h1>
          )}
        </div>
        {!isCollapsed && <p className={styles.brandSubtitle}>Management System</p>}

        {toggleSidebar && (
          <button onClick={toggleSidebar} className={styles.toggleBtn} aria-label="Toggle Sidebar">
            <span className="material-symbols-outlined">{isCollapsed ? 'menu' : 'menu_open'}</span>
          </button>
        )}
      </div>

      {/* Stage Selection */}
      <div className={styles.moduleSelect}>
        {!isCollapsed && <p className={styles.moduleLabel}>Select Module</p>}
        <div className={styles.moduleGrid} style={isCollapsed ? { gridTemplateColumns: '1fr' } : {}}>
          <Link
            href="/dashboard/rbp"
            className={`${styles.moduleBtn} ${activeStage === 'RBP' ? styles.moduleBtnActiveRBP : ''}`}
            title="Regional Budget Proposal"
          >
            <span className={`material-symbols-outlined ${styles.moduleIcon}`}>account_balance_wallet</span>
            {!isCollapsed && <span className={styles.moduleText}>RBP</span>}
          </Link>
          <Link
            href="/dashboard/gaa"
            className={`${styles.moduleBtn} ${activeStage === 'GAA' ? styles.moduleBtnActiveGAA : ''}`}
            title="Project Implementation"
          >
            <span className={`material-symbols-outlined ${styles.moduleIcon}`}>analytics</span>
            {!isCollapsed && <span className={styles.moduleText}>GAA</span>}
          </Link>
          {userRole === 'Admin' && (
            <Link
              href="/dashboard/team"
              className={`${styles.moduleBtn} ${activeStage === 'ADMIN' ? styles.moduleBtnActiveRBP : ''}`}
              style={activeStage === 'ADMIN' ? { backgroundColor: 'var(--dpwh-blue)', color: 'white' } : {}}
              title="Administration"
            >
              <span className={`material-symbols-outlined ${styles.moduleIcon}`}>admin_panel_settings</span>
              {!isCollapsed && <span className={styles.moduleText}>ADMIN</span>}
            </Link>
          )}
        </div>
      </div>

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
            {!isCollapsed && <span>Overview Dashboard</span>}
          </Link>
        </div>

        {filteredItems.length > 0 && (
          <div className={styles.navSection}>
            {!isCollapsed && (
              <div className={styles.navSectionHeader}>
                <div className={styles.navDot} style={{ backgroundColor: navConfig[activeStage].color }}></div>
                <p className={styles.navSectionLabel}>{navConfig[activeStage].label}</p>
              </div>
            )}
            {filteredItems.map(renderLink)}
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
            <div className={styles.roleBox}>
              <div className={styles.roleAvatar}>
                {userName ? userName.split(' ').map(n => n[0]).join('') : '??'}
              </div>
              <div className={styles.roleInfo}>
                <p className={styles.roleName}>{userName || 'Unknown User'}</p>
                <p className={styles.roleTitle}>{userRole || 'Guest'}</p>
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
            <Link
              href="/login"
              className={styles.btnLogout}
              onClick={async () => {
                await supabase.auth.signOut();
                localStorage.removeItem('currentUser');
              }}
              title="Logout"
            >
              <span className={`material-symbols-outlined ${styles.btnLogoutIcon}`}>logout</span>
              {!isCollapsed && 'Logout'}
            </Link>
            {!isCollapsed && (
              <div className={styles.versionBadge}>
                v2.4.0
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
