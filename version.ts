// Semantic Versioning for Dream3DForge Engine
// Major.Minor.Patch
export const ENGINE_VERSION = "1.2.0";

export const COMPATIBLE_SCHEMA_VERSIONS = ["1.0.0", "1.1.0", "1.2.0"];

export const isCompatible = (version: string) => {
    return COMPATIBLE_SCHEMA_VERSIONS.includes(version);
};
