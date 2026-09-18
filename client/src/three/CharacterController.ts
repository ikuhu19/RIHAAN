import * as THREE from 'three';
import { VihaanCharacterModel } from './CharacterModel';
import { RoomPositions } from './ThreeRoom';
import { AvatarEmotion, CharacterAction, CharacterPosture } from '../types';

export class VihaanCharacterController {
  private model: VihaanCharacterModel;
  private roomPositions: RoomPositions;

  // Active States
  public posture: CharacterPosture = 'sitting';
  public emotion: AvatarEmotion = 'idle';
  public isListening = false;
  public isThinking = false;
  public isSpeaking = false;

  // Navigation & Walking Interpolation
  private currentPosition: THREE.Vector3;
  private targetPosition: THREE.Vector3;
  private currentRotationY = 0.35;
  private targetRotationY = 0.35;
  private isMoving = false;
  private onArrivalPosture: CharacterPosture = 'sitting';

  // Blinking State
  private blinkTimer = 0;
  private nextBlinkInterval = 3.5;
  private blinkDuration = 0.16;
  private blinkProgress = 0;
  private isBlinking = false;

  // Lip Sync State
  private speechMouthTarget = 0;
  private speechMouthCurrent = 0;

  // Internal Clock
  private clock = new THREE.Clock();

  constructor(model: VihaanCharacterModel, roomPositions: RoomPositions) {
    this.model = model;
    this.roomPositions = roomPositions;

    // Start seated on the armchair
    this.currentPosition = this.roomPositions.chairSeatPosition.clone();
    this.targetPosition = this.currentPosition.clone();
    this.model.group.position.copy(this.currentPosition);
    this.model.group.rotation.y = this.currentRotationY;
  }

  // Handle high-level commands
  public handleAction(action: CharacterAction): void {
    if (action === 'sit') {
      this.walkToChairAndSit();
    } else if (action === 'stand') {
      this.standUp();
    } else if (action === 'walk_near') {
      this.walkNearCamera();
    } else if (action === 'walk_chair') {
      this.walkToChairAndSit();
    }
  }

  public standUp(): void {
    if (this.posture === 'sitting') {
      this.posture = 'standing';
      const standSpot = this.roomPositions.chairSeatPosition.clone().add(new THREE.Vector3(0.35, 0, 0.45));
      this.moveTo(standSpot, 0.2, 'standing');
    }
  }

  public walkNearCamera(): void {
    const nearSpot = this.roomPositions.nearCameraPosition.clone();
    this.moveTo(nearSpot, 0, 'standing');
  }

  public walkToChairAndSit(): void {
    const chairSpot = this.roomPositions.chairSeatPosition.clone();
    this.moveTo(chairSpot, 0.35, 'sitting');
  }

  public moveTo(target: THREE.Vector3, targetRotY: number, arrivePosture: CharacterPosture): void {
    this.targetPosition.copy(target);
    this.targetRotationY = targetRotY;
    this.onArrivalPosture = arrivePosture;
    this.posture = 'walking';
    this.isMoving = true;
  }

  public setEmotion(emotion: AvatarEmotion): void {
    this.emotion = emotion;
    this.model.setEmotion(emotion);
  }

  public setListening(listening: boolean): void {
    this.isListening = listening;
  }

  public setThinking(thinking: boolean): void {
    this.isThinking = thinking;
  }

  public setSpeaking(speaking: boolean): void {
    this.isSpeaking = speaking;
  }

  public setSpeechMouthAmount(amount: number): void {
    this.speechMouthTarget = amount;
  }

  public update(): void {
    const delta = Math.min(this.clock.getDelta(), 0.1);
    const elapsedTime = this.clock.getElapsedTime();

    // 1. Navigation & Locomotion Interpolation
    if (this.isMoving) {
      const dist = this.currentPosition.distanceTo(this.targetPosition);
      if (dist > 0.05) {
        const dir = new THREE.Vector3().subVectors(this.targetPosition, this.currentPosition).normalize();
        const speed = 1.35;
        this.currentPosition.addScaledVector(dir, speed * delta);
        this.model.group.position.copy(this.currentPosition);

        // Turn towards movement direction
        const moveAngle = Math.atan2(dir.x, dir.z);
        this.currentRotationY = THREE.MathUtils.lerp(this.currentRotationY, moveAngle, delta * 8);
        this.model.group.rotation.y = this.currentRotationY;

        // Gentle walking bob
        this.model.group.position.y = Math.abs(Math.sin(elapsedTime * 6)) * 0.04;
      } else {
        // Arrived at destination
        this.currentPosition.copy(this.targetPosition);
        this.model.group.position.copy(this.currentPosition);
        this.currentRotationY = this.targetRotationY;
        this.model.group.rotation.y = this.currentRotationY;
        this.isMoving = false;
        this.posture = this.onArrivalPosture;
        this.model.group.position.y = 0;
      }
    }

    // 2. Blinking Cycle
    this.updateBlinking(delta);

    // 3. Lip-Sync Mouth Articulation
    if (this.isSpeaking) {
      this.speechMouthCurrent = THREE.MathUtils.lerp(
        this.speechMouthCurrent,
        0.35 + Math.random() * 0.65,
        delta * 18
      );
    } else {
      this.speechMouthCurrent = THREE.MathUtils.lerp(this.speechMouthCurrent, 0, delta * 20);
    }
    this.model.setMouthOpen(this.speechMouthCurrent);

    // 4. Natural Chest Breathing Sine Wave
    const breathing = Math.sin(elapsedTime * 2.1) * 0.02;
    const joints = this.model.joints;
    if (joints.chest) {
      joints.chest.scale.set(1 + breathing * 0.4, 1 + breathing * 0.5, 1 + breathing * 0.4);
      joints.chest.position.y = 0.1 + breathing * 0.2;
    }

    // 5. Celestial Sparkles gentle drift
    if (joints.sparkles) {
      joints.sparkles.rotation.y = elapsedTime * 0.15;
    }

    // 6. Expressive Head Overlays (Listening, Thinking, Speaking, Emotions)
    this.applyBehavioralOverlays(elapsedTime, delta);
  }

  private updateBlinking(delta: number): void {
    this.blinkTimer += delta;
    if (!this.isBlinking) {
      if (this.blinkTimer >= this.nextBlinkInterval) {
        this.isBlinking = true;
        this.blinkProgress = 0;
        this.blinkTimer = 0;
        this.nextBlinkInterval = 2.5 + Math.random() * 3.0; // Random natural blink every 2.5 - 5.5s
      }
    } else {
      this.blinkProgress += delta / this.blinkDuration;
      if (this.blinkProgress <= 0.5) {
        this.model.setBlink(this.blinkProgress * 2);
      } else if (this.blinkProgress <= 1.0) {
        this.model.setBlink((1.0 - this.blinkProgress) * 2);
      } else {
        this.isBlinking = false;
        this.model.setBlink(0);
      }
    }
  }

  private applyBehavioralOverlays(elapsedTime: number, delta: number): void {
    const joints = this.model.joints;
    if (!joints.head) return;

    const lerpSpeed = Math.min(delta * 5, 1.0);

    if (this.isThinking) {
      // Thinking: Head tilted up and slightly right
      joints.head.rotation.x = THREE.MathUtils.lerp(joints.head.rotation.x, -0.12, lerpSpeed);
      joints.head.rotation.y = THREE.MathUtils.lerp(joints.head.rotation.y, 0.18, lerpSpeed);
      joints.head.rotation.z = THREE.MathUtils.lerp(joints.head.rotation.z, 0.08, lerpSpeed);
    } else if (this.isListening) {
      // Listening: Attentive forward lean and gentle nodding
      const nod = Math.sin(elapsedTime * 3.2) * 0.035;
      joints.head.rotation.x = THREE.MathUtils.lerp(joints.head.rotation.x, 0.1 + nod, lerpSpeed);
      joints.head.rotation.y = THREE.MathUtils.lerp(joints.head.rotation.y, 0, lerpSpeed);
      joints.head.rotation.z = THREE.MathUtils.lerp(joints.head.rotation.z, 0.03, lerpSpeed);
    } else if (this.isSpeaking) {
      // Speaking: Conversational head nodding with syllables
      const talkNod = Math.sin(elapsedTime * 4.5) * 0.04;
      joints.head.rotation.x = THREE.MathUtils.lerp(joints.head.rotation.x, talkNod, lerpSpeed);
      joints.head.rotation.y = THREE.MathUtils.lerp(joints.head.rotation.y, Math.sin(elapsedTime * 2) * 0.06, lerpSpeed);
      joints.head.rotation.z = THREE.MathUtils.lerp(joints.head.rotation.z, Math.sin(elapsedTime * 1.5) * 0.02, lerpSpeed);
    } else {
      // Idle: Calm natural breathing motion
      let targetHeadX = 0;
      let targetHeadY = Math.sin(elapsedTime * 0.6) * 0.05;
      let targetHeadZ = 0;

      if (this.emotion === 'happy' || this.emotion === 'playful') {
        targetHeadX = -0.03;
        targetHeadZ = 0.05; // slight playful head tilt
      } else if (this.emotion === 'sad') {
        targetHeadX = 0.12; // gentle downward tilt
      } else if (this.emotion === 'surprised') {
        targetHeadX = -0.1;
      }

      joints.head.rotation.x = THREE.MathUtils.lerp(joints.head.rotation.x, targetHeadX, lerpSpeed);
      joints.head.rotation.y = THREE.MathUtils.lerp(joints.head.rotation.y, targetHeadY, lerpSpeed);
      joints.head.rotation.z = THREE.MathUtils.lerp(joints.head.rotation.z, targetHeadZ, lerpSpeed);
    }
  }
}
