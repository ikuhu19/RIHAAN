import * as THREE from 'three';

export interface RoomPositions {
  chairSeatPosition: THREE.Vector3;
  chairLookDirection: THREE.Vector3;
  nearCameraPosition: THREE.Vector3;
  roomCenterPosition: THREE.Vector3;
}

export class VihaanVirtualRoom {
  public scene: THREE.Scene;
  public roomGroup: THREE.Group;
  public lampLight!: THREE.PointLight;
  public diyaLight!: THREE.PointLight;
  public positions: RoomPositions;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.roomGroup = new THREE.Group();
    this.roomGroup.name = 'Virtual_Room';
    this.scene.add(this.roomGroup);

    // Key interactive coordinates
    this.positions = {
      chairSeatPosition: new THREE.Vector3(-0.85, 0, -0.2),
      chairLookDirection: new THREE.Vector3(0.3, 0, 1).normalize(),
      nearCameraPosition: new THREE.Vector3(0, 0, 1.1),
      roomCenterPosition: new THREE.Vector3(0.2, 0, 0)
    };

    this.buildRoom();
    this.setupLighting();
  }

  private buildRoom(): void {
    // Materials
    // Hardwood Floor
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x221612,
      roughness: 0.5,
      metalness: 0.1
    });

    // Warm Minimalist Interior Walls
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0x121724, // Deep celestial night navy
      roughness: 0.85,
      metalness: 0.05
    });

    const trimMaterial = new THREE.MeshStandardMaterial({
      color: 0x1d2436,
      roughness: 0.6
    });

    // Dark Teak Wood for Chair & Table
    const woodMaterial = new THREE.MeshStandardMaterial({
      color: 0x3d2314, // Warm dark teak
      roughness: 0.45,
      metalness: 0.1
    });

    // Warm Velvet Cushion on Chair (peacock teal accent)
    const cushionMaterial = new THREE.MeshStandardMaterial({
      color: 0x0a4254,
      roughness: 0.8
    });

    // Traditional Patterned Rug
    const rugMaterial = new THREE.MeshStandardMaterial({
      color: 0x3d1722, // Deep wine/ruby traditional motif
      roughness: 0.9
    });

    // Brass / Gold for Lamp & Diya
    const brassMaterial = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      roughness: 0.25,
      metalness: 0.85
    });

    // Terracotta Plant Pot
    const terracottaMaterial = new THREE.MeshStandardMaterial({
      color: 0x9e5238,
      roughness: 0.7
    });

    // Plant Leaf Green
    const leafMaterial = new THREE.MeshStandardMaterial({
      color: 0x24633b,
      roughness: 0.4
    });

    // 1. Floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 10),
      floorMaterial
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.roomGroup.add(floor);

    // 2. Traditional Patterned Area Rug
    const rug = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 0.015, 2.6),
      rugMaterial
    );
    rug.position.set(-0.3, 0.008, 0.2);
    rug.receiveShadow = true;
    this.roomGroup.add(rug);

    // Rug gold fringe border
    const rugBorder = new THREE.Mesh(
      new THREE.BoxGeometry(3.3, 0.012, 2.7),
      new THREE.MeshStandardMaterial({ color: 0xc49b38, roughness: 0.6 })
    );
    rugBorder.position.set(-0.3, 0.006, 0.2);
    this.roomGroup.add(rugBorder);

    // 3. Back Wall
    const backWall = new THREE.Mesh(
      new THREE.BoxGeometry(10, 5, 0.2),
      wallMaterial
    );
    backWall.position.set(0, 2.5, -2.5);
    backWall.receiveShadow = true;
    this.roomGroup.add(backWall);

    // Left Wall
    const leftWall = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 5, 10),
      wallMaterial
    );
    leftWall.position.set(-4, 2.5, 0);
    leftWall.receiveShadow = true;
    this.roomGroup.add(leftWall);

    // Floor Baseboard Trims
    const baseboardBack = new THREE.Mesh(
      new THREE.BoxGeometry(10, 0.18, 0.06),
      trimMaterial
    );
    baseboardBack.position.set(0, 0.09, -2.38);
    this.roomGroup.add(baseboardBack);

    // 4. Celestial Window on Back Wall
    const windowFrame = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 2.4, 0.12),
      woodMaterial
    );
    windowFrame.position.set(1.4, 2.6, -2.4);
    this.roomGroup.add(windowFrame);

    // Window Glass with celestial moon glow
    const windowGlass = new THREE.Mesh(
      new THREE.PlaneGeometry(1.7, 2.1),
      new THREE.MeshBasicMaterial({
        color: 0x162a4a, // Deep twilight sky
        transparent: true,
        opacity: 0.95
      })
    );
    windowGlass.position.set(1.4, 2.6, -2.33);
    this.roomGroup.add(windowGlass);

    // Subtle moon / stars in window
    const moon = new THREE.Mesh(
      new THREE.CircleGeometry(0.18, 24),
      new THREE.MeshBasicMaterial({ color: 0xf4f1dd })
    );
    moon.position.set(1.8, 3.1, -2.32);
    this.roomGroup.add(moon);

    // 5. Vihaan's Cozy Teak Armchair
    const chairGroup = new THREE.Group();
    chairGroup.position.copy(this.positions.chairSeatPosition);
    chairGroup.rotation.y = 0.35; // Angled invitingly toward camera
    this.roomGroup.add(chairGroup);

    // Chair Seat Frame & Cushion
    const seatFrame = new THREE.Mesh(
      new THREE.BoxGeometry(0.68, 0.08, 0.64),
      woodMaterial
    );
    seatFrame.position.y = 0.42;
    seatFrame.castShadow = true;
    seatFrame.receiveShadow = true;
    chairGroup.add(seatFrame);

    const seatCushion = new THREE.Mesh(
      new THREE.BoxGeometry(0.62, 0.11, 0.58),
      cushionMaterial
    );
    seatCushion.position.set(0, 0.49, 0.01);
    seatCushion.castShadow = true;
    seatCushion.receiveShadow = true;
    chairGroup.add(seatCushion);

    // Chair Backrest
    const backFrame = new THREE.Mesh(
      new THREE.BoxGeometry(0.66, 0.72, 0.08),
      woodMaterial
    );
    backFrame.position.set(0, 0.85, -0.28);
    backFrame.castShadow = true;
    chairGroup.add(backFrame);

    const backCushion = new THREE.Mesh(
      new THREE.BoxGeometry(0.58, 0.62, 0.07),
      cushionMaterial
    );
    backCushion.position.set(0, 0.85, -0.25);
    chairGroup.add(backCushion);

    // Chair Armrests
    const leftArm = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.24, 0.62),
      woodMaterial
    );
    leftArm.position.set(-0.34, 0.64, 0);
    leftArm.castShadow = true;
    chairGroup.add(leftArm);

    const rightArm = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.24, 0.62),
      woodMaterial
    );
    rightArm.position.set(0.34, 0.64, 0);
    rightArm.castShadow = true;
    chairGroup.add(rightArm);

    // Chair Legs
    const chairLegGeom = new THREE.CylinderGeometry(0.028, 0.02, 0.44, 12);
    const legPositions = [
      [-0.28, 0.22, 0.26],
      [0.28, 0.22, 0.26],
      [-0.28, 0.22, -0.26],
      [0.28, 0.22, -0.26]
    ];
    legPositions.forEach(([x, y, z]) => {
      const leg = new THREE.Mesh(chairLegGeom, woodMaterial);
      leg.position.set(x, y, z);
      leg.castShadow = true;
      chairGroup.add(leg);
    });

    // 6. Side Table with Books, Lamp & Diya
    const tableGroup = new THREE.Group();
    tableGroup.position.set(-1.8, 0, -0.15);
    this.roomGroup.add(tableGroup);

    // Table Top
    const tableTop = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.42, 0.05, 24),
      woodMaterial
    );
    tableTop.position.y = 0.62;
    tableTop.castShadow = true;
    tableTop.receiveShadow = true;
    tableGroup.add(tableTop);

    // Central Pillar & Base
    const tablePillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.07, 0.6, 16),
      woodMaterial
    );
    tablePillar.position.y = 0.31;
    tablePillar.castShadow = true;
    tableGroup.add(tablePillar);

    const tableBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.35, 0.04, 24),
      woodMaterial
    );
    tableBase.position.y = 0.02;
    tableGroup.add(tableBase);

    // Stack of Books
    const bookColors = [0x8b3a3a, 0x1f5446, 0x243e6b];
    bookColors.forEach((color, idx) => {
      const book = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, 0.038, 0.3),
        new THREE.MeshStandardMaterial({ color, roughness: 0.6 })
      );
      book.position.set(-0.06, 0.66 + idx * 0.04, 0.05);
      book.rotation.y = 0.2 * idx;
      book.castShadow = true;
      tableGroup.add(book);
    });

    // Warm Table Lamp with Golden Shade
    const lampBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.09, 0.05, 16),
      brassMaterial
    );
    lampBase.position.set(0.12, 0.67, -0.08);
    tableGroup.add(lampBase);

    const lampStem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.015, 0.35, 12),
      brassMaterial
    );
    lampStem.position.set(0.12, 0.85, -0.08);
    tableGroup.add(lampStem);

    const lampShade = new THREE.Mesh(
      new THREE.ConeGeometry(0.18, 0.22, 20, 1, true),
      new THREE.MeshStandardMaterial({
        color: 0xfbe6a8,
        emissive: 0xffcb6b,
        emissiveIntensity: 0.5,
        roughness: 0.3
      })
    );
    lampShade.position.set(0.12, 1.05, -0.08);
    tableGroup.add(lampShade);

    // PointLight inside lamp
    this.lampLight = new THREE.PointLight(0xffdf99, 1.6, 4.5);
    this.lampLight.position.set(-1.68, 1.02, -0.23);
    this.lampLight.castShadow = true;
    this.scene.add(this.lampLight);

    // Traditional Brass Diya with gentle flame
    const diyaBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.03, 0.03, 16),
      brassMaterial
    );
    diyaBase.position.set(0.04, 0.66, 0.22);
    tableGroup.add(diyaBase);

    const diyaFlame = new THREE.Mesh(
      new THREE.SphereGeometry(0.015, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xff9900 })
    );
    diyaFlame.position.set(0.04, 0.69, 0.22);
    diyaFlame.scale.set(0.7, 1.4, 0.7);
    tableGroup.add(diyaFlame);

    this.diyaLight = new THREE.PointLight(0xffa834, 0.6, 2.2);
    this.diyaLight.position.set(-1.76, 0.72, 0.07);
    this.scene.add(this.diyaLight);

    // 7. Potted Plant in Corner
    const plantGroup = new THREE.Group();
    plantGroup.position.set(2.4, 0, -1.8);
    this.roomGroup.add(plantGroup);

    const pot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.17, 0.44, 18),
      terracottaMaterial
    );
    pot.position.y = 0.22;
    pot.castShadow = true;
    plantGroup.add(pot);

    // Monstera / Fiddle Leaf branches
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI * 2) / 6;
      const leafStem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.015, 0.6, 8),
        leafMaterial
      );
      leafStem.position.set(
        Math.cos(angle) * 0.1,
        0.55,
        Math.sin(angle) * 0.1
      );
      leafStem.rotation.z = Math.cos(angle) * 0.4;
      leafStem.rotation.x = Math.sin(angle) * 0.4;
      plantGroup.add(leafStem);

      const leaf = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 8, 8),
        leafMaterial
      );
      leaf.scale.set(0.8, 0.05, 1.3);
      leaf.position.set(
        Math.cos(angle) * 0.28,
        0.75,
        Math.sin(angle) * 0.28
      );
      leaf.rotation.y = angle;
      leaf.castShadow = true;
      plantGroup.add(leaf);
    }
  }

  private setupLighting(): void {
    // Soft Ambient Light for warm mood
    const ambientLight = new THREE.AmbientLight(0x18243b, 1.2);
    this.scene.add(ambientLight);

    // Key Warm Directional Sunlight/Moonlight through window
    const windowLight = new THREE.DirectionalLight(0x7da4d4, 1.4);
    windowLight.position.set(4, 5, -1);
    windowLight.target.position.set(0, 1, 0);
    windowLight.castShadow = true;
    windowLight.shadow.mapSize.width = 1024;
    windowLight.shadow.mapSize.height = 1024;
    this.scene.add(windowLight);
    this.scene.add(windowLight.target);

    // Gentle Front Fill Light to softly illuminate Vihaan's face
    const fillLight = new THREE.DirectionalLight(0xffeedd, 0.85);
    fillLight.position.set(0, 2.5, 3.5);
    this.scene.add(fillLight);
  }

  public update(time: number): void {
    // Subtle diya flicker
    if (this.diyaLight) {
      this.diyaLight.intensity = 0.55 + Math.sin(time * 12) * 0.08 + Math.sin(time * 23) * 0.04;
    }
  }
}
