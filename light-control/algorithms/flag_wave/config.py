config = {
    "name": "Waving Flag",
    "options": {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "type": "object",
        "properties": {
            "flag_parts": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "color": {"$ref": "#/$defs/color"},
                        "parts": {
                            "type": "integer",
                            "default": 1,
                            "min": 1
                        }
                    },
                    "required": ["color"]
                },
                "minItems": 2,
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
            }
        }
    },
    "refresh_rate": 60
}