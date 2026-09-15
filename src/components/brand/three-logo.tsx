'use client';

import * as THREE from 'three';
import { useEffect, useRef, useState } from 'react';

type ThreeLogoProps = {
  src: string;
  alt: string;
  className?: string;
  decorative?: boolean;
};

const DEFAULT_LOGO_ASPECT = 125 / 51;
const FULL_TURN = Math.PI * 2;

function easeInOutCubic(progress: number) {
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
}

export function ThreeLogo({ src, alt, className = '', decorative = false }: ThreeLogoProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [textureReady, setTextureReady] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    setTextureReady(false);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'low-power',
    });
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.setAttribute('aria-hidden', 'true');
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    mount.appendChild(renderer.domElement);

    let geometry = new THREE.PlaneGeometry(2.8, 2.8 / DEFAULT_LOGO_ASPECT);
    const material = new THREE.MeshBasicMaterial({
      side: THREE.DoubleSide,
      transparent: true,
    });
    const logo = new THREE.Mesh(geometry, material);
    scene.add(logo);

    const render = () => renderer.render(scene, camera);
    const resize = () => {
      const width = Math.max(mount.clientWidth, 1);
      const height = Math.max(mount.clientHeight, 1);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      render();
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);
    resize();

    let animationFrame = 0;
    let isAnimating = false;
    let texture: THREE.Texture | null = null;
    let logoImage: HTMLImageElement | null = null;

    const playHoverTurn = () => {
      if (isAnimating || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      isAnimating = true;
      const startedAt = performance.now();
      const duration = 820;

      const animate = (now: number) => {
        const progress = Math.min((now - startedAt) / duration, 1);
        const easedProgress = easeInOutCubic(progress);
        logo.rotation.y = easedProgress * FULL_TURN;
        logo.rotation.x = Math.sin(progress * Math.PI) * 0.08;
        render();

        if (progress < 1) {
          animationFrame = requestAnimationFrame(animate);
          return;
        }

        logo.rotation.set(0, 0, 0);
        isAnimating = false;
        render();
      };

      animationFrame = requestAnimationFrame(animate);
    };

    logoImage = new Image();
    logoImage.decoding = 'async';
    logoImage.onload = () => {
      if (!logoImage) return;

      const imageWidth = logoImage.naturalWidth || 150;
      const imageHeight = logoImage.naturalHeight || 150;
      const raster = document.createElement('canvas');
      raster.width = imageWidth;
      raster.height = imageHeight;
      const context = raster.getContext('2d');
      if (!context) return;

      context.clearRect(0, 0, imageWidth, imageHeight);
      context.drawImage(logoImage, 0, 0, imageWidth, imageHeight);

      texture = new THREE.CanvasTexture(raster);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      texture.needsUpdate = true;

      const imageAspect = imageWidth / imageHeight;
        geometry.dispose();
        geometry = new THREE.PlaneGeometry(2.8, 2.8 / imageAspect);
        logo.geometry = geometry;
        material.map = texture;
        material.needsUpdate = true;
        setTextureReady(true);
        resize();
        requestAnimationFrame(render);
    };
    logoImage.onerror = () => render();
    logoImage.src = src;

    mount.addEventListener('pointerenter', playHoverTurn);
    mount.addEventListener('pointerdown', playHoverTurn);
    mount.addEventListener('focus', playHoverTurn);

    return () => {
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      mount.removeEventListener('pointerenter', playHoverTurn);
      mount.removeEventListener('pointerdown', playHoverTurn);
      mount.removeEventListener('focus', playHoverTurn);
      geometry.dispose();
      material.dispose();
      texture?.dispose();
      if (logoImage) {
        logoImage.onload = null;
        logoImage.onerror = null;
      }
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [src]);

  return (
    <div
      ref={mountRef}
      className={`three-logo ${textureReady ? 'is-ready' : ''} ${className}`.trim()}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : alt}
      aria-hidden={decorative ? true : undefined}
      tabIndex={decorative ? -1 : 0}
    >
      <img className="three-logo-fallback" src={src} alt="" aria-hidden="true" />
    </div>
  );
}
