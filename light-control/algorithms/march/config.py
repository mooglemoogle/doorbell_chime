config = {
    "name": "March",
    "options": {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "type": "object",
        "properties": {
            "colors": {
                "type": "array",
                "items": {"$ref": "#/$defs/color"},
                "minItems": 1,
                "$defs": {
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
                    }
                }
            },
            "freq": {
                "title": "Step Frequency (seconds)",
                "type": "number",
                "default": 2,
                "minimum": 0
            }
        },
        "default": {
            "colors": [
                [0.333, 0.929, 0.663],
                [0, 0.937, 0.808],
                [0.142, 1.0, 1.0],
                [0.677, 0.833, 0.871]
            ],
            "freq": 2.0
        }
    },
    "refresh_rate": 10
}