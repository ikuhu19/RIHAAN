import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';
import { VihaanCharacterModel } from '../three/CharacterModel';
import { VihaanVirtualRoom } from '../three/ThreeRoom';
import { VihaanCharacterController } from '../three/CharacterController';
import { AvatarEmotion, CharacterAction, CharacterPosture } from '../types';
import { AvatarEngine } from '../avatar/AvatarEngine';

export interface ThreeCanvasRef {
  handleAction: (action: CharacterAction) => void;
  setPosture: (posture: CharacterPosture) => void;
  setEmotion: (emotion: AvatarEmotion) => void;
  setListening: (listening: boolean) => void;
  setThinking: (thinking: boolean) => void;
  setSpeaking: (speaking: boolean) => void;
}

interface ThreeCanvasProps {
  emotion: AvatarEmotion;
  isListening: boolean;
  isThinking: boolean;
  isSpeaking: boolean;
  onAvatarClick?: () => void;
}

export const ThreeCanvas = forwardRef<ThreeCanvasRef, ThreeCanvasProps>(
  ({ emotion, isListening, isThinking, isSpeaking, onAvatarClick }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const controllerRef = useRef<VihaanCharacterController | null>(null);
    const [webGlSupported, setWebGlSupported] = useState(true);

    useImperativeHandle(ref, () => ({
      handleAction: (action: CharacterAction) => {
        controllerRef.current?.handleAction(action);
      },
      setPosture: (posture: CharacterPosture) => {
        if (posture === 'standing') {
          controllerRef.current?.standUp();
        } else if (posture === 'sitting') {
          controllerRef.current?.walkToChairAndSit();
        }
      },
      setEmotion: (emo: AvatarEmotion) => {
        controllerRef.current?.setEmotion(emo);
      },
      setListening: (listening: boolean) => {
        controllerRef.current?.setListening(listening);
      },
      setThinking: (thinking: boolean) => {
        controllerRef.current?.setThinking(thinking);
      },
      setSpeaking: (speaking: boolean) => {
        controllerRef.current?.setSpeaking(speaking);
      }
    }));

    // Update controller reactive state props
    useEffect(() => {
      if (controllerRef.current) {
        controllerRef.current.setEmotion(emotion);
        controllerRef.current.setListening(isListening);
        controllerRef.current.setThinking(isThinking);
        controllerRef.current.setSpeaking(isSpeaking);
      }
    }, [emotion, isListening, isThinking, isSpeaking]);

    useEffect(() => {
      if (!containerRef.current) return;
      const container = containerRef.current;

      let renderer: THREE.WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance'
        });
      } catch (err) {
        console.warn('WebGL initialization failed, using 2D fallback:', err);
        setWebGlSupported(false);
        return;
      }

      renderer.setSize(container.clientWidth, container.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      container.appendChild(renderer.domElement);

      // Scene & Camera
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0c111d); // Atmospheric midnight room backdrop

      const camera = new THREE.PerspectiveCamera(
        42,
        container.clientWidth / container.clientHeight,
        0.1,
        50
      );
      // Intimate eye-level framing focused on Vihaan
      camera.position.set(-0.4, 1.45, 3.2);
      camera.lookAt(-0.35, 1.05, 0);

      // Virtual Room
      const room = new VihaanVirtualRoom(scene);

      // 3D Vihaan Character Model
      const characterModel = new VihaanCharacterModel();
      scene.add(characterModel.group);

      // Animation Controller
      const controller = new VihaanCharacterController(characterModel, room.positions);
      controllerRef.current = controller;

      // Mouse Parallax for immersive depth
      let mouseX = 0;
      let mouseY = 0;
      const onMouseMove = (e: MouseEvent) => {
        const rect = container.getBoundingClientRect();
        mouseX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
        mouseY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      };
      window.addEventListener('mousemove', onMouseMove);

      // Resize Listener
      const onResize = () => {
        if (!container) return;
        const width = container.clientWidth;
        const height = container.clientHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
      };
      window.addEventListener('resize', onResize);

      // Render Loop
      let animationFrameId: number;
      const clock = new THREE.Clock();

      const animate = () => {
        animationFrameId = requestAnimationFrame(animate);

        const elapsedTime = clock.getElapsedTime();
        controller.update();
        room.update(elapsedTime);

        // Gentle camera breathing & mouse parallax
        const targetCamX = -0.4 + mouseX * 0.15;
        const targetCamY = 1.45 - mouseY * 0.08 + Math.sin(elapsedTime * 0.8) * 0.02;
        camera.position.x += (targetCamX - camera.position.x) * 0.05;
        camera.position.y += (targetCamY - camera.position.y) * 0.05;
        camera.lookAt(-0.35, 1.05, 0);

        renderer.render(scene, camera);
      };

      animate();

      return () => {
        cancelAnimationFrame(animationFrameId);
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('resize', onResize);
        if (renderer.domElement && container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
        renderer.dispose();
      };
    }, []);

    if (!webGlSupported) {
      return (
        <AvatarEngine
          emotion={emotion}
          isListening={isListening}
          isThinking={isThinking}
          isSpeaking={isSpeaking}
          onAvatarClick={onAvatarClick}
        />
      );
    }

    return (
      <div
        ref={containerRef}
        className="three-viewport-container"
        onClick={onAvatarClick}
        style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
      />
    );
  }
);
ThreeCanvas.displayName = 'ThreeCanvas';
