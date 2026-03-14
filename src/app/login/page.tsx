'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import styles from './page.module.css';

// Dummy accounts for different roles
const DUMMY_ACCOUNTS = [
    { email: 'admin@dpwh.gov.ph', username: 'admin', password: 'password123', role: 'Admin', name: 'System Admin', route: '/dashboard/team' },
    { email: 'chief@dpwh.gov.ph', username: 'chief', password: 'password123', role: 'Section Chief', name: 'Carlos Santos', route: '/dashboard/modules' },
    { email: 'head@dpwh.gov.ph', username: 'head', password: 'password123', role: 'Unit Head', name: 'Antonio Reyes', route: '/dashboard/unit-head-task' },
    { email: 'user@dpwh.gov.ph', username: 'user', password: 'password123', role: 'Regular Member', name: 'Maria Dela Cruz', route: '/dashboard/user-task' },
    { email: 'planning@dpwh.gov.ph', username: 'planning', password: 'password123', role: 'Planning Unit Head', name: 'James Rodriguez', route: '/dashboard/rbp-progress' },
];

export default function Login() {
    const router = useRouter();
    const [showPassword, setShowPassword] = useState(false);
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const getRedirectRoute = (role: string) => {
        switch (role) {
            case 'Admin': return '/dashboard/team';
            case 'Section Chief': return '/dashboard/modules';
            case 'Unit Head': return '/dashboard/unit-head-task';
            case 'Planning Unit Head': return '/dashboard/rbp-progress';
            case 'Planning Engineer': return '/dashboard/planning-member-task';
            case 'Regular Member':
            case 'Unit Member':
            default: return '/dashboard/user-task';
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        const cleanIdentifier = identifier.trim();
        const cleanPassword = password.trim();

        try {
            // Try exactly what was entered first
            let finalEmail = cleanIdentifier;
            if (!cleanIdentifier.includes('@')) {
                finalEmail = `${cleanIdentifier}@dpwh.gov.ph`;
            }
            
            console.log('Attempting login with:', finalEmail);
            let { data, error: authError } = await supabase.auth.signInWithPassword({
                email: finalEmail,
                password: cleanPassword,
            });

            // If it failed and didn't have @, try @gmail.com as a fallback (convenience for demo)
            if (authError && !cleanIdentifier.includes('@')) {
                const gmailEmail = `${cleanIdentifier}@gmail.com`;
                console.log('Retrying with:', gmailEmail);
                const retry = await supabase.auth.signInWithPassword({
                    email: gmailEmail,
                    password: cleanPassword,
                });
                data = retry.data;
                authError = retry.error;
            }

            if (authError) {
                setError(authError.message === 'Invalid login credentials' ? 'Invalid credentials. Please try again.' : authError.message);
                setIsSubmitting(false);
                return;
            }

            if (data?.user) {
                console.log('Login successful for user:', data.user.id);
                // The AuthProvider will handle session detection, profile fetching, and legacy localStorage sync
                // We just need to fetch the profile here to know where to redirect immediately.
                const { data: profile, error: profileError } = await supabase
                    .from('employees')
                    .select('position')
                    .eq('id', data.user.id)
                    .maybeSingle();
                
                if (profileError) {
                    console.error('Profile fetch error during login:', profileError);
                }
                
                const role = profile?.position || 'Regular Member';
                const targetRoute = getRedirectRoute(role);
                console.log('Redirecting to:', targetRoute, 'based on role:', role);
                router.push(targetRoute);
            }
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred during login.');
        } finally {
            setIsSubmitting(false);
        }
    };


    return (
        <div className={styles.container}>
            {/* Background */}
            <div className={styles.bgWrapper}>
                <div className={styles.glowTopLeft}></div>
                <div className={styles.glowBottomRight}></div>
            </div>

            {/* Main Login Card */}
            <main className={styles.main}>
                <div className={styles.glassCard}>
                    {/* Logo/Icon Section */}
                    <div className={styles.header}>
                        <div className={styles.logoBox}>
                            <span className={`material-symbols-outlined ${styles.logoIcon}`}>engineering</span>
                        </div>
                        <h1 className={styles.title}>DPWH Task Management</h1>
                        <p className={styles.subtitle}>District Engineering Office Portal</p>
                    </div>

                    {/* Form Fields */}
                    <form onSubmit={handleLogin} className={styles.formGroup}>
                        {error && (
                            <div style={{ color: '#ef4444', backgroundColor: '#fee2e2', padding: '0.75rem', borderRadius: '0.5rem', fontSize: '0.875rem', marginBottom: '1rem', textAlign: 'center' }}>
                                {error}
                            </div>
                        )}

                        {/* Email or Username Field */}
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Email or Username</label>
                            <div className={styles.inputWrapper}>
                                <span className={`material-symbols-outlined ${styles.inputIcon}`} style={{ fontSize: '1.25rem' }}>person</span>
                                <input
                                    type="text"
                                    placeholder="email or username"
                                    className={styles.inputField}
                                    value={identifier}
                                    onChange={(e) => setIdentifier(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Password</label>
                            <div className={styles.inputWrapper}>
                                <span className={`material-symbols-outlined ${styles.inputIcon}`} style={{ fontSize: '1.25rem' }}>lock</span>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    className={styles.inputField}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                                <button
                                    type="button"
                                    className={styles.visibilityBtn}
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    <span className={`material-symbols-outlined ${styles.inputIcon}`} style={{ position: 'relative', left: 0 }}>
                                        {showPassword ? 'visibility_off' : 'visibility'}
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* Options */}
                        <div className={styles.optionsWrapper}>
                            <label className={styles.checkboxLabel}>
                                <input type="checkbox" className={styles.checkbox} />
                                <span className={styles.checkboxText}>Remember Me</span>
                            </label>
                            <a href="#" className={styles.forgotLink}>Forgot Password?</a>
                        </div>

                        {/* Submit Button */}
                        <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
                            {isSubmitting ? (
                                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent mx-auto"></div>
                            ) : (
                                <>
                                    <span>Sign In</span>
                                    <span className={`material-symbols-outlined ${styles.submitIcon}`}>login</span>
                                </>
                            )}
                        </button>
                    </form>


                    {/* Footer Info */}
                    <div className={styles.cardFooter}>
                        <p className={styles.footerTitle}>Department of Public Works and Highways</p>
                        <div className={styles.dots}>
                            <span className={styles.dot}></span>
                            <span className={styles.dot}></span>
                            <span className={styles.dot}></span>
                        </div>
                    </div>
                </div>

                {/* Bottom Security Notice */}
                <p className={styles.securityNotice}>
                    Authorized Personnel Access Only<br />
                    DEPARTMENT OF PUBLIC WORKS AND HIGHWAYS © 2026<br />
                    <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>Develop by Engineer Dikit</span>
                </p>
            </main>
        </div>
    );
}
