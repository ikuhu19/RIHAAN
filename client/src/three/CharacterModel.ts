import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { AvatarEmotion } from '../types';

export interface CharacterJoints {
  root: THREE.Group;
  chest: THREE.Group;
  head: THREE.Group;
  mouth: THREE.Mesh;
  leftEyelid: THREE.Mesh;
  rightEyelid: THREE.Mesh;
  aura: THREE.Mesh;
  sparkles: THREE.Points;
}

export class VihaanCharacterModel {
  public group: THREE.Group;
  public joints: CharacterJoints;
  public isCustomGLB = false;
  private customModel: THREE.Object3D | null = null;
  private morphTargetMeshes: THREE.Mesh[] = [];

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'Vihaan_Character_Root';
    this.joints = this.buildAestheticCharacter();

    // Check and attempt to load custom GLB if user placed it in /assets/vihaan/vihaan.glb
    this.checkAndLoadCustomGLB('/assets/vihaan/vihaan.glb');
  }

  private buildAestheticCharacter(): CharacterJoints {
    const root = new THREE.Group();
    root.name = 'Vihaan_Rig_Root';
    this.group.add(root);

    // Position character comfortably on the chair cushion
    // Chair cushion is at (-0.85, 0.49, -0.2)
    root.position.set(-0.85, 0.48, -0.2);
    root.rotation.y = 0.35; // Angled invitingly toward camera

    // Chest & Upper Torso Pivot
    const chest = new THREE.Group();
    chest.name = 'Chest_Pivot';
    chest.position.set(0, 0.1, 0);
    root.add(chest);

    // Head Pivot
    const head = new THREE.Group();
    head.name = 'Head_Pivot';
    head.position.set(0, 0.65, 0.05);
    chest.add(head);

    // Materials
    // Texture loader for Vihaan's approved high-resolution portrait
    const textureLoader = new THREE.TextureLoader();
    const portraitTexture = textureLoader.load('/vihaan_portrait.jpg');
    portraitTexture.colorSpace = THREE.SRGBColorSpace;

    // Curved Portrait Relief Mesh (Softly sculpted aesthetic representation)
    const portraitGeometry = new THREE.PlaneGeometry(0.85, 1.15, 32, 32);
    // Apply gentle organic curvature along X axis so it feels dimensional, not flat
    const posAttr = portraitGeometry.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const zCurve = -Math.pow(x / 0.42, 2) * 0.08;
      posAttr.setZ(i, zCurve);
    }
    portraitGeometry.computeVertexNormals();

    const portraitMaterial = new THREE.MeshStandardMaterial({
      map: portraitTexture,
      roughness: 0.55,
      metalness: 0.08,
      side: THREE.DoubleSide
    });

    const characterCanvas = new THREE.Mesh(portraitGeometry, portraitMaterial);
    characterCanvas.position.set(0, 0.55, 0.02);
    characterCanvas.castShadow = true;
    characterCanvas.receiveShadow = true;
    head.add(characterCanvas);

    // Royal Peacock-Teal & Gold Arch Trim Frame
    const frameMaterial = new THREE.MeshStandardMaterial({
      color: 0xd4af37, // Rich royal gold
      roughness: 0.25,
      metalness: 0.85
    });

    // Gold Bezel Border
    const bezel = new THREE.Mesh(
      new THREE.TorusGeometry(0.52, 0.018, 16, 64, Math.PI),
      frameMaterial
    );
    bezel.position.set(0, 0.78, 0.03);
    head.add(bezel);

    // Delicate Peacock Brooch at Collar / Chest
    const brooch = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.035, 0),
      new THREE.MeshStandardMaterial({
        color: 0x0ea5a4, // Peacock teal gem
        emissive: 0x0ea5a4,
        emissiveIntensity: 0.35,
        roughness: 0.2,
        metalness: 0.9
      })
    );
    brooch.position.set(0, 0.24, 0.06);
    chest.add(brooch);

    // Articulated Mouth / Lip-Sync Mesh Overlay
    // Positioned over mouth area for real-time speech articulation
    const mouthMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.065, 0.012, 0.01),
      new THREE.MeshStandardMaterial({
        color: 0x8b453e,
        roughness: 0.6,
        transparent: true,
        opacity: 0
      })
    );
    mouthMesh.position.set(0, 0.46, 0.045);
    head.add(mouthMesh);

    // Articulated Eyelids for Natural Blinking
    const eyelidMaterial = new THREE.MeshStandardMaterial({
      color: 0xb57a4c, // Warm Indian skin tone
      roughness: 0.7,
      transparent: true,
      opacity: 0
    });

    const leftEyelid = new THREE.Mesh(
      new THREE.PlaneGeometry(0.045, 0.022),
      eyelidMaterial
    );
    leftEyelid.position.set(-0.055, 0.58, 0.045);
    head.add(leftEyelid);

    const rightEyelid = new THREE.Mesh(
      new THREE.PlaneGeometry(0.045, 0.022),
      eyelidMaterial
    );
    rightEyelid.position.set(0.055, 0.58, 0.045);
    head.add(rightEyelid);

    // Glowing Celestial Peacock Aura Disc behind Vihaan
    const auraGeom = new THREE.CircleGeometry(0.58, 32);
    const auraMaterial = new THREE.MeshBasicMaterial({
      color: 0x0ea5a4,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide
    });
    const aura = new THREE.Mesh(auraGeom, auraMaterial);
    aura.position.set(0, 0.55, -0.04);
    head.add(aura);

    // Golden Celestial Dust Sparkles
    const sparkleCount = 28;
    const sparkleGeom = new THREE.BufferGeometry();
    const sparklePos = new Float32Array(sparkleCount * 3);
    for (let i = 0; i < sparkleCount * 3; i += 3) {
      sparklePos[i] = (Math.random() - 0.5) * 1.1;
      sparklePos[i + 1] = Math.random() * 1.2;
      sparklePos[i + 2] = (Math.random() - 0.5) * 0.6;
    }
    sparkleGeom.setAttribute('position', new THREE.BufferAttribute(sparklePos, 3));

    const sparkleMaterial = new THREE.PointsMaterial({
      color: 0xfde047,
      size: 0.024,
      transparent: true,
      opacity: 0.6
    });
    const sparkles = new THREE.Points(sparkleGeom, sparkleMaterial);
    root.add(sparkles);

    return {
      root,
      chest,
      head,
      mouth: mouthMesh,
      leftEyelid,
      rightEyelid,
      aura,
      sparkles
    };
  }

  // Attempt to load external GLB model if supplied in /assets/vihaan/
  private checkAndLoadCustomGLB(url: string): void {
    const loader = new GLTFLoader();
    loader.load(
      url,
      (gltf) => {
        console.log('✨ Custom Vihaan GLB model successfully loaded from:', url);
        this.isCustomGLB = true;
        this.customModel = gltf.scene;

        // Hide procedural celestial presentation
        this.joints.head.visible = false;
        this.joints.chest.visible = false;

        // Scale & position custom model
        this.customModel.scale.set(1, 1, 1);
        this.customModel.position.set(0, 0, 0);
        this.joints.root.add(this.customModel);

        // Find any blendshapes / morph targets
        this.customModel.traverse((child) => {
          if ((child as THREE.Mesh).isMesh && (child as THREE.Mesh).morphTargetDictionary) {
            this.morphTargetMeshes.push(child as THREE.Mesh);
          }
        });
      },
      undefined,
      (error) => {
        // No custom GLB found, smoothly using the built-in High-Aesthetic Celestial presence
        console.info('Using built-in high-aesthetic Vihaan presence (no custom GLB in /assets/vihaan/vihaan.glb).');
      }
    );
  }

  // Lip-Sync: open mouth according to speech syllables
  public setMouthOpen(amount: number): void {
    const clamped = Math.max(0, Math.min(1, amount));

    // Custom GLB Morph Targets
    if (this.isCustomGLB && this.morphTargetMeshes.length > 0) {
      this.morphTargetMeshes.forEach((mesh) => {
        if (!mesh.morphTargetDictionary || !mesh.morphTargetInfluences) return;
        const targets = ['viseme_aa', 'viseme_O', 'jawOpen', 'mouthOpen'];
        for (const target of targets) {
          const idx = mesh.morphTargetDictionary[target];
          if (idx !== undefined) {
            mesh.morphTargetInfluences[idx] = clamped;
            break;
          }
        }
      });
      return;
    }

    // Built-in High-Aesthetic presentation
    if (this.joints.mouth) {
      this.joints.mouth.scale.y = 1 + clamped * 4.2;
      this.joints.mouth.scale.x = 1 + clamped * 0.4;
      (this.joints.mouth.material as THREE.MeshStandardMaterial).opacity = clamped * 0.85;
    }
  }

  // Eye blinking (0 = open, 1 = closed)
  public setBlink(amount: number): void {
    const clamped = Math.max(0, Math.min(1, amount));

    // Custom GLB Morph Targets
    if (this.isCustomGLB && this.morphTargetMeshes.length > 0) {
      this.morphTargetMeshes.forEach((mesh) => {
        if (!mesh.morphTargetDictionary || !mesh.morphTargetInfluences) return;
        const targets = ['eyeBlinkLeft', 'eyeBlinkRight', 'blink'];
        for (const target of targets) {
          const idx = mesh.morphTargetDictionary[target];
          if (idx !== undefined) {
            mesh.morphTargetInfluences[idx] = clamped;
          }
        }
      });
      return;
    }

    // Built-in presentation
    if (this.joints.leftEyelid && this.joints.rightEyelid) {
      (this.joints.leftEyelid.material as THREE.MeshStandardMaterial).opacity = clamped * 0.95;
      (this.joints.rightEyelid.material as THREE.MeshStandardMaterial).opacity = clamped * 0.95;
    }
  }

  public setEmotion(emotion: AvatarEmotion): void {
    // Subtle aura color shifting based on emotional mood
    if (this.joints.aura) {
      const mat = this.joints.aura.material as THREE.MeshBasicMaterial;
      if (emotion === 'happy' || emotion === 'playful') {
        mat.color.setHex(0xd4af37); // Golden warmth
        mat.opacity = 0.22;
      } else if (emotion === 'thinking') {
        mat.color.setHex(0x0ea5a4); // Peacock teal
        mat.opacity = 0.25;
      } else if (emotion === 'sad') {
        mat.color.setHex(0x60a5fa); // Soft calm blue
        mat.opacity = 0.12;
      } else {
        mat.color.setHex(0x0ea5a4);
        mat.opacity = 0.15;
      }
    }
  }
}
