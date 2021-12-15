config = {
    "name": "Pulse & Switch",
    "options": {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "type": "object",
        "properties": {
            "colors": {
                "type": "array",
                "items": {"$ref": "#/$defs/color"},
                "minItems": 2,
                "maxItems": 2,
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
            "onTime": {
                "title": "On Time (seconds)",
                "type": "number",
                "default": 5,
                "minimum": 0
            },
            "pulseTime": {
                "title": "On Time (seconds)",
                "type": "number",
                "default": 0.5,
                "minimum": 0
            },
            "lightsPerColor": {
                "title": "Number of lights per color",
                "type": "integer",
                "default": 1,
                "minimum": 1
            }
        },
        "default": {
            "colors": [
                [0.333, 0.929, 0.663],
                [0, 0.937, 0.808]
            ],
            "onTime": 5,
            "pulseTime": 0.5,
            "lightsPerColor": 1
        }
    },
    "refresh_rate": 60
}