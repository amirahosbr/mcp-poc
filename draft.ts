// Case1: Simple Character Request
//
// * simple prompt (text)
// * -> [planning task]
// * -> character description (text)
// * -> [generate main image]
// * -> main image (Array<Image>)
// * -> [generate spread image]
// * -> spread images (Array<Image>)

// Case2: Character Generation Request with Description
//
// * detailed prompt (text)
// * [generate main image]
// * -> main image (Array<Image>)
// * -> [generate spread image]
// * -> spread images (Array<Image>)

// Case3: Providing Sample Images
//
// * sample images (Array<Image>)
// * -> [analyze sample images]
// * -> character description (text)
// * -> [generate main image]
// * -> main image (Array<Image>)
// * -> [generate spread image]
// * -> spread images (Array<Image>)

type Workflow = Readonly<{
  prompt: string;
  images?: ReadonlyArray<Image>;
  steps: ReadonlyArray<Step>;
}>;

type PlanningTaskStep = "planningTask";
type AnalyzeSampleImages = "analyzeSampleImages";
type GenerateMainImage = "generateMainImage";
type GenerateSpreadImages = "generateSpreadImages";

type StepType =
  | PlanningTaskStep
  | AnalyzeSampleImages
  | GenerateMainImage
  | GenerateSpreadImages;

type Step =
  | { type: PlanningTaskStep }
  | { type: AnalyzeSampleImages }
  | { type: GenerateMainImage }
  | { type: GenerateSpreadImages };

type StepInput =
  | { type: PlanningTaskStep; content: string }
  | { type: AnalyzeSampleImages; content: ReadonlyArray<Image> }
  | { type: GenerateMainImage; content: Description }
  | { type: GenerateSpreadImages; content: ReadonlyArray<Image> };

type Image = {
  base64: Base64;
};

type Base64 = string;

type CharacterGenerateResponse = {
  mainImage: ReadonlyArray<Image>;
  spreadImages: ReadonlyArray<Image>;
};

type WorkflowContext = {
  input: StepInput;
};

const firstStep = (workflow: Workflow): Step => workflow.steps[0];

/**
 * Generates character images based on the provided workflow.
 */
const generateCharacterMCP = (
  workflow: Workflow,
): CharacterGenerateResponse => {
  const input: StepInput = (() => {
    const first = firstStep(workflow);
    if (first.type === "planningTask") {
      return { type: "planningTask", content: workflow.prompt };
    }
    if (first.type === "analyzeSampleImages") {
      if (!Array.isArray(workflow.prompt)) {
        throw new Error("Expected an array of images for sample analysis");
      }
      return { type: "analyzeSampleImages", content: workflow.images || [] };
    }
    if (first.type === "generateMainImage") {
      return { type: "generateMainImage", content: workflow.prompt };
    }
    if (first.type === "generateSpreadImages") {
      return { type: "generateSpreadImages", content: workflow.images || [] };
    }
    throw new Error("Unexpectedly reached the end of step processing");
  })();

  const initialCtx: WorkflowContext = {
    input,
  };

  const result = workflow.steps.reduce((currentCtx, step): WorkflowContext => {
    if (
      step.type === "planningTask" &&
      currentCtx.input.type === "planningTask"
    ) {
      return {
        input: {
          type: "generateMainImage" as const,
          content: plan(currentCtx.input.content),
        },
      };
    }
    if (
      step.type === "analyzeSampleImages" &&
      currentCtx.input.type === "analyzeSampleImages"
    ) {
      return {
        input: {
          type: "generateMainImage" as const,
          content: analyzeSampleImages(currentCtx.input.content),
        },
      };
    }
    if (
      step.type === "generateMainImage" &&
      currentCtx.input.type === "generateMainImage"
    ) {
      return {
        input: {
          type: "generateSpreadImages" as const,
          content: generateMainImage(currentCtx.input.content),
        },
      };
    }
    if (
      step.type === "generateSpreadImages" &&
      currentCtx.input.type === "generateSpreadImages"
    ) {
      return {
        input: {
          type: "generateSpreadImages" as const,
          content: generateSpreadImages(currentCtx.input.content),
        },
      };
    }
    throw new Error("Unexpectedly reached the end of step processing");
  }, initialCtx);

  return {
    mainImage: [],
    spreadImages: [],
  };
};

type Description = string;

const plan = (input: string): Description => {
  console.log("Step A: planning for", input);
  return input;
};

const analyzeSampleImages = (input: ReadonlyArray<Image>): Description => {
  console.log("Step B: analyzing images", input.length);
  return "Analyzed description";
};

const generateMainImage = (input: Description): ReadonlyArray<Image> => {
  console.log("Step C: generating main image for", input);
  return [{ base64: "base64string" }];
};

const generateSpreadImages = (
  input: ReadonlyArray<Image>,
): ReadonlyArray<Image> => {
  console.log("Step D: generating spread images for", input.length);
  return [{ base64: "base64string" }];
};

// -------------------------------

const exampleInput1: Workflow = {
  prompt: "A fantasy character with a sword and shield",
  steps: [
    { type: "planningTask" },
    {
      type: "generateMainImage",
    },
    { type: "generateSpreadImages" },
  ],
};

generateCharacterMCP(exampleInput1);
