"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import styles from './ProfileModal.module.css';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import Cropper from 'react-easy-crop';
import getCroppedImg from '@/lib/cropImage';

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUploadSuccess: (newUrl: string) => void;
}

export default function ProfileModal({ isOpen, onClose, onUploadSuccess }: ProfileModalProps) {
    const { profile } = useAuth();
    const [isDragging, setIsDragging] = useState(false);
    
    // Upload state
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(profile?.avatar_url || null);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Cropping state
    const [isCropping, setIsCropping] = useState(false);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

    const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setPreviewUrl(profile?.avatar_url || null);
            setSelectedFile(null);
            setError(null);
            setIsCropping(false);
            setZoom(1);
            setCrop({ x: 0, y: 0 });
        }
    }, [isOpen, profile?.avatar_url]);

    if (!isOpen) return null;

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const processFile = (file: File) => {
        if (!file.type.startsWith('image/')) {
            setError('Please select an image file (PNG, JPG, WEBP).');
            return;
        }

        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            setError('Image is too large. Please select a file under 5MB.');
            return;
        }

        setError(null);
        setSelectedFile(file);
        
        // Create local preview URL and enter crop mode
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreviewUrl(reader.result as string);
            setIsCropping(true);
        };
        reader.readAsDataURL(file);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            processFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            processFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!profile?.id) return;
        
        // If not in cropping mode but we have an existing avatar_url, nothing to save, or they clicked save without change
        if (!isCropping && !selectedFile) {
            onClose();
            return;
        }

        if (!previewUrl || !croppedAreaPixels) return;

        setIsUploading(true);
        setError(null);

        try {
            // 1. Crop Image
            const croppedImageFile = await getCroppedImg(previewUrl, croppedAreaPixels);
            if (!croppedImageFile) throw new Error("Failed to crop image.");

            // 2. Upload file to Supabase Storage
            const fileExt = croppedImageFile.name.split('.').pop() || 'jpeg';
            const fileName = `${profile.id}-${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, croppedImageFile, { upsert: true });

            if (uploadError) throw uploadError;

            // 3. Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            // 4. Update Employee profile in DB
            const { error: dbError } = await supabase
                .from('employees')
                .update({ avatar_url: publicUrl })
                .eq('id', profile.id);

            if (dbError) throw dbError;

            onUploadSuccess(publicUrl);
            onClose();

        } catch (err: any) {
            console.error('Error uploading avatar:', err);
            setError(err.message || 'Failed to upload photo. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

    const cancelCropping = () => {
        setIsCropping(false);
        setPreviewUrl(profile?.avatar_url || null);
        setSelectedFile(null);
        setError(null);
    };

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <h2 className={styles.title}>{isCropping ? 'Adjust Picture' : 'Update Profile Picture'}</h2>
                    <button className={styles.closeButton} onClick={onClose} aria-label="Close">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {isCropping && previewUrl ? (
                    <div className={styles.cropSection}>
                        <div className={styles.cropperContainer}>
                            <Cropper
                                image={previewUrl}
                                crop={crop}
                                zoom={zoom}
                                aspect={1}
                                cropShape="round"
                                showGrid={false}
                                onCropChange={setCrop}
                                onCropComplete={onCropComplete}
                                onZoomChange={setZoom}
                            />
                        </div>
                        <div className={styles.sliderContainer}>
                            <span className={styles.sliderLabel}>Zoom</span>
                            <input
                                type="range"
                                value={zoom}
                                min={1}
                                max={3}
                                step={0.1}
                                aria-labelledby="Zoom"
                                onChange={(e) => setZoom(Number(e.target.value))}
                                className={styles.slider}
                            />
                        </div>
                        <div className={styles.actions} style={{ justifyContent: 'space-between' }}>
                            <button className={styles.btnCancel} onClick={cancelCropping} disabled={isUploading}>
                                Choose Another
                            </button>
                            <div className={styles.actions} style={{ marginTop: 0 }}>
                                <button className={styles.btnCancel} onClick={onClose} disabled={isUploading}>Cancel</button>
                                <button className={styles.btnSave} onClick={handleUpload} disabled={isUploading}>
                                    {isUploading ? (
                                        <>
                                            <span className="material-symbols-outlined" style={{ animation: 'spin 1s linear infinite' }}>sync</span>
                                            Saving...
                                        </>
                                    ) : 'Save Picture'}
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        <div 
                            className={`${styles.uploadArea} ${isDragging ? styles.uploadAreaDragging : ''}`}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {previewUrl ? (
                                <div className={styles.previewContainer}>
                                    <img src={previewUrl} alt="Preview" className={styles.previewImage} />
                                    <div className={styles.previewOverlay}>
                                        <span className="material-symbols-outlined uploadIcon" style={{ color: 'white' }}>change_circle</span>
                                        <span>Change Picture</span>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <span className={`material-symbols-outlined ${styles.uploadIcon}`}>photo_camera</span>
                                    <p className={styles.uploadText}>Click or drag to upload</p>
                                    <p className={styles.uploadSubtext}>SVG, PNG, JPG or WEBP (max. 5MB)</p>
                                </>
                            )}
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleFileChange} 
                                className={styles.fileInput} 
                                accept="image/png, image/jpeg, image/webp" 
                            />
                        </div>

                        {error && <p className={styles.errorText}>{error}</p>}

                        <div className={styles.actions}>
                            <button className={styles.btnCancel} onClick={onClose}>Cancel</button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
