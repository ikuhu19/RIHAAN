# 🪶 Vihaan 3D Custom Character Model Directory

Place your custom 3D model file in this directory:
`client/public/assets/vihaan/vihaan.glb`

---

## 🎨 Specifications & Format Guidelines

Vihaan's 3D engine automatically detects and loads `vihaan.glb` if placed in this folder. If no file is provided, the engine gracefully displays the built-in High-Aesthetic Celestial presence inside the virtual room.

### 1. Recommended Format:
* **Format**: `.glb` (Binary GLTF, self-contained with textures and materials) or `.gltf`
* **Polygon Count**: 15,000 – 65,000 triangles (optimized for smooth 60fps in browser)
* **Textures**: 1024x1024 or 2048x2048 diffuse/albedo, roughness, normal map. Avoid high metallic/shiny values on skin.

### 2. Character Rigging & Bone Hierarchy:
* Compatible with standard humanoid rigs:
  * **ReadyPlayerMe** standard avatars (male body type)
  * **Mixamo** humanoid bone naming (`mixamorig:Hips`, `mixamorig:Spine`, `mixamorig:Head`, etc.)
  * **Blender** standard human rig (`hips`, `spine`, `neck`, `head`, `arm`, `leg`)

### 3. Blendshapes / Morph Targets for Facial Expression & Lip-Sync:
If your model includes ARKit or ReadyPlayerMe facial blendshapes, Vihaan will automatically bind:
* **Speech Lip-Sync**: `viseme_aa`, `viseme_O`, `viseme_sil`, or `jawOpen`
* **Blinking**: `eyeBlinkLeft`, `eyeBlinkRight`, or `blink`
* **Emotions**: `mouthSmile`, `browInnerUp`, `browDownLeft`, `browDownRight`

### 4. Aesthetic Direction:
* Young adult Indian male
* Dark curly/wavy natural hair
* Expressive almond-shaped eyes
* Soft masculine jawline with calm, intelligent warmth
* Traditional Indian clothing (Peacock-teal Bandhgala / Sherwani with subtle gold embroidery)
* Subtle jewelry (small gold ear stud / peacock brooch)
