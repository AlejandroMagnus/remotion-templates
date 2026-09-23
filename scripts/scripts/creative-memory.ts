import fs from "node:fs";
import path from "node:path";

import type {
  CreativeMemoryItem,
  CreativeProfile,
} from "../src/strategy/CreativeDiversityDirector";

type Mode =
  | "read"
  | "register";

type SupabaseContentItem = {
  id?: number;
  content_code: string;
  creative_profile:
    | CreativeProfile
    | null;
};

const mode =
  process.argv[2] as
    | Mode
    | undefined;

const productionCode =
  process.argv[3] ??
  process.env.PRODUCTION_CODE;

if (
  mode !== "read" &&
  mode !== "register"
) {
  throw new Error(
    "Uso: creative-memory.ts <read|register> <production-code>",
  );
}

if (!productionCode) {
  throw new Error(
    "Production code no definido.",
  );
}

const supabaseUrl =
  process.env.SUPABASE_URL;

const supabaseKey =
  process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl) {
  throw new Error(
    "SUPABASE_URL no definido.",
  );
}

if (!supabaseKey) {
  throw new Error(
    "SUPABASE_SECRET_KEY no definido.",
  );
}

function normalizeSupabaseRestUrl(
  value: string,
): string {
  return value
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/rest\/v1$/i, "")
    .concat("/rest/v1");
}

const restUrl =
  normalizeSupabaseRestUrl(
    supabaseUrl,
  );

const headers = {
  apikey:
    supabaseKey,

  Authorization:
    `Bearer ${supabaseKey}`,

  "Content-Type":
    "application/json",
};

function generatedPath(
  suffix: string,
): string {
  return path.join(
    process.cwd(),
    "public",
    "generated",
    `${productionCode}-${suffix}.json`,
  );
}

async function request(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const response =
    await fetch(
      url,
      {
        ...options,

        headers: {
          ...headers,
          ...(options.headers ?? {}),
        },
      },
    );

  if (!response.ok) {
    const body =
      await response.text();

    throw new Error(
      `Supabase ${response.status}: ${body}`,
    );
  }

  return response;
}

function isCreativeProfile(
  value: unknown,
): value is CreativeProfile {
  if (
    !value ||
    typeof value !== "object"
  ) {
    return false;
  }

  const profile =
    value as Partial<
      CreativeProfile
    >;

  return Boolean(
    profile.version ===
      "V3.18-A" &&
    profile.genre &&
    profile.narrativeArchitecture &&
    profile.rhythm &&
    profile.visualLanguage &&
    profile.prosody &&
    profile.ctaStrategy,
  );
}

function toMemoryItem(
  row: SupabaseContentItem,
): CreativeMemoryItem | null {
  if (
    !isCreativeProfile(
      row.creative_profile,
    )
  ) {
    return null;
  }

  const profile =
    row.creative_profile;

  return {
    productionCode:
      row.content_code,

    genre:
      profile.genre,

    narrativeArchitecture:
      profile.narrativeArchitecture,

    rhythm:
      profile.rhythm,

    visualLanguage:
      profile.visualLanguage,

    prosody:
      profile.prosody,

    ctaStrategy:
      profile.ctaStrategy,
  };
}

async function loadMemory():
  Promise<CreativeMemoryItem[]> {
  const url =
    `${restUrl}/content_items` +
    "?select=id,content_code,creative_profile" +
    "&creative_profile=not.is.null" +
    "&order=id.asc";

  const response =
    await request(
      url,
    );

  const rows =
    await response.json() as
      SupabaseContentItem[];

  return rows
    .map(
      toMemoryItem,
    )
    .filter(
      (
        item,
      ): item is
        CreativeMemoryItem =>
          item !== null,
    );
}

function readSelectedProfile():
  CreativeProfile {
  const filePath =
    generatedPath(
      "creative-decision",
    );

  if (
    !fs.existsSync(
      filePath,
    )
  ) {
    throw new Error(
      `No existe decisión creativa: ${filePath}`,
    );
  }

  const data =
    JSON.parse(
      fs.readFileSync(
        filePath,
        "utf8",
      ),
    ) as {
      selected?:
        CreativeProfile;
    };

  if (
    !isCreativeProfile(
      data.selected,
    )
  ) {
    throw new Error(
      "La decisión creativa no contiene un perfil V3.18-A válido.",
    );
  }

  return data.selected;
}

async function read():
  Promise<void> {
  const memory =
    await loadMemory();

  const outputPath =
    generatedPath(
      "creative-memory",
    );

  fs.mkdirSync(
    path.dirname(
      outputPath,
    ),
    {
      recursive: true,
    },
  );

  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      {
        version:
          "V3.18-B-CREATIVE-MEMORY",

        productionCode,

        memorySize:
          memory.length,

        items:
          memory,
      },
      null,
      2,
    ),
    "utf8",
  );

  console.log("");
  console.log(
    "======================================",
  );

  console.log(
    "V3.18-B — MEMORIA CREATIVA",
  );

  console.log(
    "======================================",
  );

  console.log(
    `Production: ${productionCode}`,
  );

  console.log(
    `Creative memory items: ${memory.length}`,
  );

  if (
    memory.length > 0
  ) {
    const recent =
      memory.slice(
        -3,
      );

    console.log(
      "Últimos perfiles:",
    );

    for (
      const item of recent
    ) {
      console.log(
        `- ${item.productionCode}: ` +
        `${item.genre} / ` +
        `${item.narrativeArchitecture}`,
      );
    }
  } else {
    console.log(
      "Memoria creativa vacía: primera selección V3.18.",
    );
  }

  console.log(
    "======================================",
  );
}

async function register():
  Promise<void> {
  const profile =
    readSelectedProfile();

  const encoded =
    encodeURIComponent(
      productionCode,
    );

  const lookupUrl =
    `${restUrl}/content_items` +
    "?select=id,content_code" +
    `&content_code=eq.${encoded}` +
    "&limit=1";

  const lookupResponse =
    await request(
      lookupUrl,
    );

  const rows =
    await lookupResponse.json() as
      Array<{
        id: number;
        content_code: string;
      }>;

  const existing =
    rows[0];

  if (!existing?.id) {
    throw new Error(
      `No existe content_items para ${productionCode}. ` +
      "La Memoria Editorial debe registrarse primero.",
    );
  }

  await request(
    `${restUrl}/content_items?id=eq.${existing.id}`,
    {
      method:
        "PATCH",

      headers: {
        Prefer:
          "return=minimal",
      },

      body:
        JSON.stringify(
          {
            creative_profile:
              profile,

            updated_at:
              new Date()
                .toISOString(),
          },
        ),
    },
  );

  console.log("");
  console.log(
    "======================================",
  );

  console.log(
    "V3.18-B — PERFIL CREATIVO REGISTRADO",
  );

  console.log(
    "======================================",
  );

  console.log(
    `Production: ${productionCode}`,
  );

  console.log(
    `Genre: ${profile.genre}`,
  );

  console.log(
    `Architecture: ${profile.narrativeArchitecture}`,
  );

  console.log(
    `Rhythm: ${profile.rhythm}`,
  );

  console.log(
    `Visual language: ${profile.visualLanguage}`,
  );

  console.log(
    `Prosody: ${profile.prosody}`,
  );

  console.log(
    `CTA: ${profile.ctaStrategy}`,
  );

  console.log(
    "======================================",
  );
}

async function main():
  Promise<void> {
  if (
    mode === "read"
  ) {
    await read();
    return;
  }

  await register();
}

main().catch(
  (error) => {
    console.error("");
    console.error(
      "CREATIVE MEMORY ERROR",
    );
    console.error(
      error,
    );

    process.exit(1);
  },
);
