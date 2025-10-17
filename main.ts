import OpenAI, { toFile } from "openai";
import "dotenv/config";
import fs from "fs";
import path from "path";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// tdd -> type driven development (got feedback from compiler - fast and semantically correct)

// Case1: Simple Character Request
//
// * simple prompt (text)
// * -> [planning task]
// * -> character description (text)
// * -> [generate main image]
// * -> main image (Array<Image>)
// * -> [generate spread image]
// * -> spread images (Array<Image>)

// Case2: Character Generation Request with Description <--- this
//
// * detailed prompt (text)
// * [generate main image]
// * -> main image (Array<Image>)
// * -> [generate spread image]
// * -> spread images (Array<Image>)

// * detailed prompt (text)
// * [analyze text] (user → gives detailed text → system extracts text)

// Case3: Providing Sample Images
//
// * sample images (Array<Image>)
// * -> [analyze sample images]
// * -> character description (text)
// * -> [generate main image]
// * -> main image (Array<Image>)
// * -> [generate spread image]
// * -> spread images (Array<Image>)

// Case4: Edit Images
// * prompt (text)
// * -> [planning task]
// * -> character description (text)
// * -> [apply canvas rules]
// * -> canvas-applied description (text)
// * -> [generate main image]
// * -> main image (Array<Image>)
// * -> [generate spread image]
// * -> spread images (Array<Image>)

// Case5: Character Request with different variations
//
// * prompt (text)
// * -> [planning task]
// * -> character description (text)
// * -> [apply canvas rules]
// * -> canvas-applied description (text)
// * -> [generate main image]
// * -> main image (Array<Image>)
// * -> [generate spread image]
// * -> spread images (Array<Image>) -> 1. secret agent character 2. story telling image

// TODO:
// refactor.. to maybe more semantic readable code
// fill the blanks in the functions
// start with 6 steps... implement real functions inside the functions with openai.
// spec tests. dont use mock data.

// constructor functions.
// complete the cli.
// validation function.

type Workflow = {
  prompt: string;
  images?: ReadonlyArray<Image>;
  steps: ReadonlyArray<Step>;
};

type PlanningTask = "planningTask";
type AnalyzeSampleImages = "analyzeSampleImages";
type GenerateMainImage = "generateMainImage";
type GenerateSpreadImages = "generateSpreadImages";
type EditImages = "editImages";

type Step =
  | { type: PlanningTask }
  | { type: AnalyzeSampleImages }
  | { type: GenerateMainImage }
  | { type: GenerateSpreadImages }
  | { type: EditImages };

type StepInput =
  | { type: PlanningTask; content: string }
  | { type: AnalyzeSampleImages; content: ReadonlyArray<Image> }
  | { type: GenerateMainImage; content: Description }
  | { type: GenerateSpreadImages; content: ReadonlyArray<Image> }
  | { type: EditImages; content: string };

type Image = {
  base64: Base64;
};

type Base64 = string;

type CharacterGenerateResponse = {
  mainImages: ReadonlyArray<Image>;
  spreadImages: ReadonlyArray<Image>;
};

type WorkflowContext = {
  input: StepInput;
};

const firstStep = (workflow: Workflow): Step => workflow.steps[0];

// user-defined type guards
namespace StepType {
  // exported fx that takes any Step and returns true only when that step’s type property is the string "planningTask" (ts narrows step from big union to exact type eg: planningTask)
  export const isPlanningTask = (step: Step): step is { type: PlanningTask } =>
    step.type === "planningTask";

  export const isGenerateMainImage = (
    step: Step
  ): step is { type: GenerateMainImage } => step.type === "generateMainImage";

  export const isGenerateSpreadImages = (
    step: Step
  ): step is { type: GenerateSpreadImages } =>
    step.type === "generateSpreadImages";

  export const isAnalyzeSampleImages = (
    step: Step
  ): step is { type: AnalyzeSampleImages } =>
    step.type === "analyzeSampleImages";

  export const isEditImages = (step: Step): step is { type: EditImages } =>
    step.type === "editImages";
}

// interface of our mcp tools
const generateCharacterMCP = async (
  workflow: Workflow
): Promise<CharacterGenerateResponse> => {
  const input: StepInput = (() => {
    const first = firstStep(workflow);

    // if the first step is a "planning-task", then return an object type is string "planningTask" and content is the prompt taken from the workflow.
    if (StepType.isPlanningTask(first)) {
      return { type: "planningTask", content: workflow.prompt };
    }

    if (StepType.isAnalyzeSampleImages(first)) {
      return { type: "analyzeSampleImages", content: workflow.images ?? [] };
    }

    if (StepType.isGenerateMainImage(first)) {
      return { type: "generateMainImage", content: workflow.prompt };
    }

    if (StepType.isEditImages(first)) {
      return {
        type: "editImages",
        content: workflow.prompt,
      };
    }

    throw new Error("unexpectedly reached the end of step processing");
  })();

  let initialCtx: WorkflowContext = {
    input,
  };

  // result/return value:
  for (const step of workflow.steps) {
    if (
      StepType.isPlanningTask(step) &&
      initialCtx.input.type === "planningTask"
    ) {
      const description = await plan(initialCtx.input.content);

      initialCtx = {
        input: { type: "generateMainImage", content: description },
      };
      console.log("✅ Planning done → Next step ready");
    }

    if (
      StepType.isAnalyzeSampleImages(step) &&
      initialCtx.input.type === "analyzeSampleImages"
    ) {
      const description = await analyzeSampleImages(initialCtx.input.content);

      initialCtx = {
        input: { type: "generateMainImage", content: description },
      };
      console.log("✅ Analyzing sample images done → Next step ready");
    }

    if (
      StepType.isGenerateMainImage(step) &&
      initialCtx.input.type === "generateMainImage"
    ) {
      const images = await generateMainImage(initialCtx.input.content);

      initialCtx = {
        input: { type: "generateSpreadImages", content: images },
      };
      console.log("✅ Generating main image done → Next step ready");
    }

    if (
      StepType.isGenerateSpreadImages(step) &&
      initialCtx.input.type === "generateSpreadImages"
    ) {
      await generateSpreadImages(initialCtx.input.content);

      // stop loop here
      console.log("✅ Spread images generated — workflow complete");
      break;
    }

    if (StepType.isEditImages(step) && initialCtx.input.type === "editImages") {
      const editedImages = await editImages(initialCtx.input.content);

      initialCtx = {
        input: {
          type: "analyzeSampleImages",
          content: editedImages,
        },
      };
    }
  }

  return {
    mainImages: [],
    spreadImages: [],
  };
};

type TextModel = "gpt-4o-mini" | "gpt-5";
type ImageModel = "gpt-image-1";

const OpenAIModels = {
  planning: "gpt-4o-mini" as TextModel,
  imageGeneration: "gpt-image-1" as ImageModel,
  imageAnalysis: "gpt-4o-mini" as TextModel,
  imageVariation: "dall-e-2" as ImageModel,
};

type Description = string; // maybe can have limit length later

// workers
const plan = async (input: string): Promise<Description> => {
  console.log("Step A: planning for", input);

  const response = await openai.chat.completions.create({
    model: OpenAIModels.planning,
    messages: [
      { role: "system", content: "You are an image generation planner." },
      {
        role: "user",
        content: `Expand this idea into a detailed character description suitable for image generation: "${input}"`,
      },
    ],
  });

  const description = response.choices[0].message.content ?? "";
  console.log("Planned Description:", description);
  return description; // function returns a string (Description)
};

// takes array of images and returns a text string (Analyze the content of an image)
const analyzeSampleImages = async (
  input: ReadonlyArray<Image>
): Promise<Description> => {
  console.log("Step B: analyzing images", input.length);

  // convert base64 image to text
  const imageContents = input.map((img) => ({
    type: "image_url" as const,
    image_url: { url: `data:image/jpeg;base64,${img.base64}` },
  }));

  const response = await openai.chat.completions.create({
    model: OpenAIModels.imageAnalysis,
    messages: [
      { role: "system", content: "what's in this image?" },
      {
        role: "user",
        content: [
          { type: "text", text: "Analyze the content of the image: " },
          ...imageContents,
        ],
      },
    ],
  });

  const description = response.choices[0].message.content ?? "";
  console.log("Analyzed sample images:", description);

  return description;
};

// takes input a text string and returns output an array of images
const generateMainImage = async (
  input: Description
): Promise<ReadonlyArray<Image>> => {
  console.log("Step C: generating main image for", input);

  const response = await openai.images.generate({
    model: OpenAIModels.imageGeneration,
    prompt: input,
    size: "1024x1024",
    n: 1,
  });

  // Save the image to a file
  const image_base64 = response.data?.[0]?.b64_json ?? "";
  const image_bytes = Buffer.from(image_base64, "base64");
  fs.writeFileSync("main.png", image_bytes);

  console.log("Generated main image: base64");

  return [{ base64: image_base64 }];
};

// takes an array of images and returns an array of images
const generateSpreadImages = async (
  input: ReadonlyArray<Image>
): Promise<ReadonlyArray<Image>> => {
  console.log("Step D: generating spread images for", input.length);

  if (!input.length || !input[0]?.base64) {
    throw new Error("❌ No base image provided or base64 missing");
  }

  // ensure folder exists
  const outputDir = path.join(process.cwd(), "tmp", "spread");
  fs.mkdirSync(outputDir, { recursive: true });

  // write the base image to a temporary file
  const baseImagePath = path.join(outputDir, "base.png");
  fs.writeFileSync(baseImagePath, Buffer.from(input[0].base64, "base64"));

  // create variations
  const response = await openai.images.createVariation({
    model: OpenAIModels.imageVariation, // dall-e-2
    image: fs.createReadStream(baseImagePath),
    n: 3,
    size: "1024x1024",
    response_format: "b64_json",
  });

  // save and return
  const variations: ReadonlyArray<Image> =
    response.data?.map((item, i) => {
      const base64 = item.b64_json!;
      const fileName = path.join(outputDir, `spread_${i + 1}.png`);
      fs.writeFileSync(fileName, Buffer.from(base64, "base64"));
      console.log(`✅ Saved: ${fileName}`);
      return { base64 };
    }) ?? [];

  return variations;
};

const editImages = async (input: string): Promise<ReadonlyArray<Image>> => {
  console.log("Step E: editing images", input);

  const inputDir = path.join(process.cwd(), "tmp", "edit");
  // Clear previous edited results only
  const existingFiles = fs.readdirSync(inputDir);
  for (const file of existingFiles) {
    if (file.startsWith("edited_result") && file.endsWith(".png")) {
      fs.unlinkSync(path.join(inputDir, file));
    }
  }
  // Load sample input images
  const imageFiles = existingFiles
    .filter((file) => file.endsWith(".png"))
    .map((file) => path.join(inputDir, file));
  // convert to openai file objects
  const images = await Promise.all(
    imageFiles.map(
      async (file) =>
        await toFile(fs.createReadStream(file), null, {
          type: "image/png",
        })
    )
  );

  const response = await openai.images.edit({
    model: OpenAIModels.imageGeneration,
    image: images,
    prompt: input,
    size: "1024x1024",
    background: "opaque",
  });

  // Save new edited result
  const editedBase64 = response.data?.[0]?.b64_json ?? "";
  const timestamp = Date.now();
  const outputPath = path.join(inputDir, `edited_result_${timestamp}.png`);
  fs.writeFileSync(outputPath, Buffer.from(editedBase64, "base64"));

  console.log(`✅ Saved edited image: ${outputPath}`);
  return [{ base64: editedBase64 }];
};

// input from user
const exampleInput1: Workflow = {
  prompt: "A fantasy character with a sword and shield",
  steps: [
    {
      type: "planningTask",
    },
    {
      type: "generateMainImage",
    },
    { type: "generateSpreadImages" },
  ],
};

const exampleInput2: Workflow = {
  prompt:
    "A female elf warrior character with a sword and shield in a forest background studio ghibli style",
  steps: [
    {
      type: "planningTask",
    },
    {
      type: "generateMainImage",
    },
    { type: "generateSpreadImages" },
  ],
};

const exampleInput3: Workflow = {
  prompt:
    "A kawaii angry cat girl elf warrior character with a sword and shield in a forest background studio ghibli style",
  images: [
    {
      base64: fs.readFileSync("cat.jpg", "base64"),
    },
  ],
  steps: [
    {
      type: "analyzeSampleImages",
    },
    {
      type: "generateMainImage",
    },
    { type: "generateSpreadImages" },
  ],
};

// Case4: Edit Images
const sampleImages = fs.readdirSync("tmp/spread").map((file) => ({
  base64: fs.readFileSync(path.join("tmp/spread", file), "base64"),
}));

const exampleInput4: Workflow = {
  prompt:
    "use 4 input images to generate a new image of a gift basket containing the items in the reference images",
  images: sampleImages,
  steps: [
    {
      type: "editImages",
    },
    {
      type: "analyzeSampleImages",
    },
  ],
};

generateCharacterMCP(exampleInput4);
