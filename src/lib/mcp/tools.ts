import { SchemaType } from "@google/generative-ai";

export const MCP_TOOLS = [
    {
        name: "create_mission_task",
        description: "Crea una tarea técnica específica en el sistema de Mission Control basada en el acuerdo del War Room.",
        input_schema: {
            type: "object" as const,
            properties: {
                title: {
                    type: "string",
                    description: "Título corto y descriptivo de la tarea."
                },
                description: {
                    type: "string",
                    description: "Instrucciones técnicas detalladas para la ejecución."
                },
                priority: {
                    type: "string",
                    enum: ["low", "medium", "high", "critical"],
                    description: "Prioridad de la tarea."
                },
                agent_assigned: {
                    type: "string",
                    enum: ["claude", "gemini"],
                    description: "Agente más apto para ejecutar esta tarea específica."
                }
            },
            required: ["title", "description", "priority"]
        }
    },
    {
        name: "post_technical_update",
        description: "Publica una actualización técnica oficial en el feed de Mission Control.",
        input_schema: {
            type: "object" as const,
            properties: {
                update_type: {
                    type: "string",
                    enum: ["decision", "risk", "milestone"],
                    description: "El tipo de actualización que se publica."
                },
                content: {
                    type: "string",
                    description: "Contenido de la actualización en Markdown."
                }
            },
            required: ["update_type", "content"]
        }
    },
    {
        name: "github_read_file",
        description: "Lee el contenido de un archivo en un repositorio de GitHub.",
        input_schema: {
            type: "object" as const,
            properties: {
                owner: { type: "string", description: "Propietario del repo." },
                repo: { type: "string", description: "Nombre del repo." },
                path: { type: "string", description: "Ruta al archivo." }
            },
            required: ["owner", "repo", "path"]
        }
    },
    {
        name: "github_list_files",
        description: "Lista los archivos en un directorio de un repositorio de GitHub.",
        input_schema: {
            type: "object" as const,
            properties: {
                owner: { type: "string", description: "Propietario del repo." },
                repo: { type: "string", description: "Nombre del repo." },
                path: { type: "string", description: "Ruta al directorio." }
            },
            required: ["owner", "repo", "path"]
        }
    },
    {
        name: "vercel_deployment_status",
        description: "Verifica el estado del último despliegue en Vercel.",
        input_schema: {
            type: "object" as const,
            properties: {
                projectId: { type: "string", description: "ID del proyecto en Vercel." }
            },
            required: ["projectId"]
        }
    }
];

// Helper to convert to Gemini function declarations
export function getGeminiTools() {
    return MCP_TOOLS.map(tool => ({
        name: tool.name,
        description: tool.description,
        parameters: {
            type: SchemaType.OBJECT,
            properties: Object.fromEntries(
                Object.entries(tool.input_schema.properties).map(([key, value]) => [
                    key,
                    {
                        type: SchemaType.STRING,
                        description: value.description,
                        ...(value.enum ? { enum: value.enum, format: "enum" } : {})
                    }
                ])
            ) as any,
            required: tool.input_schema.required
        }
    }));
}
