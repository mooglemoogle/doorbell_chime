config = {
    "name": "Lightning Bolts",
    "options": {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "type": "object",
        "properties": {
            "color": {
                "title": "Color (HSV)",
                "type": "array",
                "minItems": 3,
                "maxItems": 4,
                "items": {
                    "type": "number",
                    "inclusiveMinimum": 0.0,
                    "inclusiveMaximum": 1.0
                }
            },
            "max_bolts": { type: "number" },
            "bolt_prob": { type: "number", "inclusiveMinimum": 0.0, "inclusiveMaximum": 1.0 },
            "bump_prob": { type: "number", "inclusiveMinimum": 0.0, "inclusiveMaximum": 1.0 },
        },
        "default": {
            "color": [0, 0, 1],
            "max_bolts": 3,
            "bolt_prob": 0.001,
            "bump_prob": 0.01,
        }
    },
    "refresh_rate": 60
}