# GETTING STARTED

Run in the terminal:

```bash
npx tsx main.ts
```

## GOAL (AI-driven workflow orchestration system):

- ai generated yaml.. then yaml gonna execute our workflow...
- maybe ai provide in yaml for loop to summarize something... we just processsed the yaml ... so if want to ai generate workflow, dont have to be yaml.. can be json..
- single function in multiple workflow inside... predefined functions, and template workflows so ai will generate the ...

> Yes — it’s completely possible and very powerful to have AI generate YAML workflows that call TypeScript-defined functions.

**my task today + tomorrow + etc. :**

- focus on cli
- git pull from main (after merge with spencer) and build cli

# Project Structure

```
yaml-workflow-prototype/
├── package.json
├── tsconfig.json
├── src/
│   ├── functions/
│   │   └── index.ts          # Predefined functions
│   ├── workflow/
│   │   ├── executor.ts       # YAML parser & executor
│   │   └── validator.ts      # Schema validation
│   ├── cli.ts               # CLI interface
│   └── types.ts             # TypeScript types
├── workflows/
│   ├── example-workflow.yaml
│   └── ai-generated-workflow.yaml
└── README.md
```

## Output

case 2:

```
Step A: planning for A female elf warrior character with a sword and shield in a forest background studio ghibli style
Step E: understanding text [ --> analyzeKeywords
  'A',         'female',
  'elf',       'warrior',
  'character', 'with',
  'a',         'sword',
  'and',       'shield',
  'in',        'a',
  'forest',    'background',
  'studio',    'ghibli',
  'style'
]
Step C: generating main image for A female elf warrior character with a sword and shield in a forest background studio ghibli style
Step D: generating spread images for 1
```

case 3:

prompt ─►plan──►fusePromptAndImages──►generateMainImage──►generateSpreadImages
images ──────────▲

```
 npx tsx main.ts
Step A: planning for A female elf warrior character with a sword and shield in a forest background studio ghibli style
Step F: fusing images and prompt {
  prompt: 'A female elf warrior character with a sword and shield in a forest background studio ghibli style',
  images: [ { base64: 'base64string' } ]
}
Step E: understanding word [
  'A',         'female',
  'elf',       'warrior',
  'character', 'with',
  'a',         'sword',
  'and',       'shield',
  'in',        'a',
  'forest',    'background',
  'studio',    'ghibli',
  'style'
]
Step B: analyzing images 1
Step C: generating main image for A female elf warrior character with a sword and shield in a forest background studio ghibli style
Step D: generating spread images for 1
```

---

```
User Idea (text)
   ↓
GPT-4o (Planning)
 → creates detailed prompt
   ↓
GPT-Image-1 (Image Generation)
 → generates image
```

---

## Planning

Step 1 → waits for Step 2 → waits for Step 3

> https://platform.openai.com/docs/guides/reasoning-best-practices (reasoning best practices)

```ts
const exampleInput1: Workflow = {
  prompt:
    "A female elf warrior character with a sword and shield in a forest background studio ghibli style", // This is the source!
  steps: [
    { type: "planningTask" }, // Step 1: Expects text input → uses prompt
    { type: "generateMainImage" }, // Step 2: Uses output from Step 1
    { type: "generateSpreadImages" }, // Step 3: Uses main image (stub)
  ],
};
```

**how to read**

if the first step is a planning-task (and the type-guard says true), then return an object whose type is the string "planningTask" and whose content is the prompt taken from the workflow.

```ts
if (StepType.isPlanningTask(first)) {
  return { type: "planningTask", content: workflow.prompt };
}
```

**plan**

| pattern          | keyword                  | meaning        |
| ---------------- | ------------------------ | -------------- |
| 🔁 `for...of`    | “do this step by step”   | sequential     |
| ⚡ `Promise.all` | “do everything together” | parallel       |
| ➕ `reduce()`    | “combine into one”       | accumulation   |
| 🔢 `for`         | “repeat with index”      | manual control |

---

| Situation                                    | Use             | Why                         |
| -------------------------------------------- | --------------- | --------------------------- |
| Step-by-step tasks (depends on previous)     | `for...of`      | waits each step             |
| All tasks independent (no waiting)           | `Promise.all()` | runs fast together          |
| Need math-like folding (sum, combine, count) | `reduce()`      | combines into one           |
| Need index or counting                       | `for`           | direct control              |
| Need to just read or print                   | `forEach()`     | side effect only (no await) |

| pattern          | keyword                  | meaning        |
| ---------------- | ------------------------ | -------------- |
| 🔁 `for...of`    | “do this step by step”   | sequential     |
| ⚡ `Promise.all` | “do everything together” | parallel       |
| ➕ `reduce()`    | “combine into one”       | accumulation   |
| 🔢 `for`         | “repeat with index”      | manual control |

Start: Workflow → Get First Step → Set Initial Input
Loop: For each Step...
├── Match? → Call Function (e.g., plan()) → Update Input for Next Step
└── No Match? → Error
End: Return Images (main + spread)

for...of pattern:

```
Iteration 1: PlanningTask step + Planning input
├── Both true → Await plan() → Get string desc → Update to GenerateMainImage input
└── Log ✅ → Next iteration

Iteration 2: GenerateMainImage step + (new) GenerateMainImage input
├── Both true → Await generateMainImage(desc string) → Get Image[] → Update to Spread input
└── Log ✅

Iteration 3: Spread → Await generateSpreadImages(images) → Final images
└── Return {mainImages, spreadImages}
```

### generateMainImage

text (prompt/description)
↓
openai.images.generate()
↓
base64 image string
↓
save or return

### analyzeSampleImages -> case 3

🔹 Running step: planningTask, currentCtx: planningTask
✅ Planning done → Next step ready
🔹 Running step: analyzeSampleImages, currentCtx: analyzeSampleImages
✅ Analyzing sample images done → Next step ready
🔹 Running step: generateMainImage, currentCtx: generateMainImage
✅ Generating main image done → Next step ready
🔹 Running step: generateSpreadImages, currentCtx: generateSpreadImages
✅ Generating spread images done → Next step ready

### editImages -> case 4

> take multiple sample images (4) from tmp/edit,
> send them all to the API,
> and get one final edited image result (not one per input).

// Case3: Providing Sample Images
//
// _ sample images (Array<Image>)
// _ -> [analyze sample images]
// _ -> character description (text)
// _ -> [generate main image]
// _ -> main image (Array<Image>)
// _ -> [generate spread image]
// \* -> spread images (Array<Image>)

Case4: Edit Images

input: images, prompt or analyzeSampleImages output?
output: image

changed flow by add extra step edit images..

```
okay the iseditimages takes 2 value.. prompt string and readonlyarray image..

and for iteration for...of loop... after edit images function finishes, it will go to next step ? which is generate main image.. but generate main image input is string..
```

> user uploads → edit images → analyze → generate main → spreads
> one extra analysis step (but realistic for AI pipelines — edit → re-analyze → generate)

```
Step E: editing images Add a unicorn to the image
✅ Saved edited image: /Users/amirah/Documents/testing/yaml-tutorial/tmp/edit/edited_result.png

Step B: analyzing images 1
Analyzed sample images: The image features a playful, round container designed to resemble a unicorn. It has a smiling face with eyes closed, a pink snout, and accents like a golden horn and colorful mane. The container appears to be situated on a wooden countertop in a kitchen setting, with kitchen utensils and a kettle visible in the background. The overall aesthetic is cheerful and whimsical, likely aimed at a younger audience or for decorative purposes.
✅ Analyzing sample images done → Next step ready

Step C: generating main image for The image features a playful, round container designed to resemble a unicorn. It has a smiling face with eyes closed, a pink snout, and accents like a golden horn and colorful mane. The container appears to be situated on a wooden countertop in a kitchen setting, with kitchen utensils and a kettle visible in the background. The overall aesthetic is cheerful and whimsical, likely aimed at a younger audience or for decorative purposes.
Generated main image: base64
✅ Generating main image done → Next step ready
```
