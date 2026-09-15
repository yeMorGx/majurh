'use client';

import * as THREE from 'three';
import { useEffect, useRef, useState } from 'react';

type ThreeLogoProps = {
  src: string;
  alt: string;
  className?: string;
};

const DEFAULT_LOGO_ASPECT = 125 / 51;
const FULL_TURN = Math.PI * 2;

function easeInOutCubic(progress: number) {
  return progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
}

export function ThreeLogo({ src, alt, className = '' }: ThreeLogoProps) {
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
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.setAttribute('aria-hidden', 'true');
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    mount.appendChild(renderer.domElement);

    let geometry = new THREE.PlaneGeometry(2.8, 2.8 / DEFAULT_LOGO_ASPECT);
    const material = new THREE.MeshBasicMaterial({
      alphaTest: 0.01,
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

    const loader = new THREE.TextureLoader();
    loader.load(
      src,
      (loadedTexture) => {
        texture = loadedTexture;
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
        texture.needsUpdate = true;

        const image = texture.image as { width?: number; height?: number } | undefined;
        const imageAspect = image?.width && image?.height ? image.width / image.height : DEFAULT_LOGO_ASPECT;
        geometry.dispose();
        geometry = new THREE.PlaneGeometry(2.8, 2.8 / imageAspect);
        logo.geometry = geometry;
        material.map = texture;
        material.needsUpdate = true;
        setTextureReady(true);
        resize();
      },
      undefined,
      () => render(),
    );

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
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [src]);

  return (
    <div
      ref={mountRef}
      className={`three-logo ${textureReady ? 'is-ready' : ''} ${className}`.trim()}
      role="img"
      aria-label={alt}
      tabIndex={0}
    >
      <img className="three-logo-fallback" src={src} alt="" aria-hidden="true" />
    </div>
  );
}
