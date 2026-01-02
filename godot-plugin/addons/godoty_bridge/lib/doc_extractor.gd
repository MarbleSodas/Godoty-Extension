@tool
extends RefCounted
class_name GodotyDocExtractor

## Extracts documentation from ClassDB for Godoty

# Cache for performance
var _cache: Dictionary = {}
var _cache_timeout: float = 3600.0  # 1 hour


func handle_get_class_docs(params: Dictionary) -> Dictionary:
	var class_name: String = params.get("class_name", "")
	var include_inherited: bool = params.get("include_inherited", false)
	
	if class_name.is_empty():
		return _error(-32602, "Missing class_name parameter")
	
	if not ClassDB.class_exists(class_name):
		return _error(-32001, "Class not found: %s" % class_name, {
			"suggestion": _find_similar_classes(class_name)
		})
	
	# Check cache
	var cache_key := "%s_%s" % [class_name, include_inherited]
	if _cache.has(cache_key):
		var cached: Dictionary = _cache[cache_key]
		if Time.get_unix_time_from_system() - cached.timestamp < _cache_timeout:
			return cached.data
	
	# Build documentation
	var doc := _build_class_docs(class_name, include_inherited)
	
	# Cache result
	_cache[cache_key] = {
		"data": doc,
		"timestamp": Time.get_unix_time_from_system()
	}
	
	return doc


func handle_get_method_docs(params: Dictionary) -> Dictionary:
	var class_name: String = params.get("class_name", "")
	var method_name: String = params.get("method_name", "")
	
	if class_name.is_empty() or method_name.is_empty():
		return _error(-32602, "Missing class_name or method_name parameter")
	
	if not ClassDB.class_exists(class_name):
		return _error(-32001, "Class not found: %s" % class_name)
	
	var methods := ClassDB.class_get_method_list(class_name)
	for method in methods:
		if method.name == method_name:
			return {
				"success": true,
				"class_name": class_name,
				"method": _format_method(method)
			}
	
	return _error(-32000, "Method not found: %s.%s" % [class_name, method_name])


func handle_search_docs(params: Dictionary) -> Dictionary:
	var query: String = params.get("query", "").to_lower()
	var search_in: Array = params.get("search_in", ["classes", "methods", "properties", "signals"])
	var limit: int = params.get("limit", 20)
	
	if query.is_empty():
		return _error(-32602, "Missing query parameter")
	
	var results: Array[Dictionary] = []
	var all_classes := ClassDB.get_class_list()
	
	for class_name in all_classes:
		if results.size() >= limit:
			break
		
		# Search class names
		if "classes" in search_in:
			if class_name.to_lower().contains(query):
				results.append({
					"type": "class",
					"class_name": class_name,
					"name": class_name,
					"description": "",  # Would need EditorHelp for descriptions
					"relevance": _calculate_relevance(class_name.to_lower(), query)
				})
		
		# Search methods
		if "methods" in search_in:
			for method in ClassDB.class_get_method_list(class_name, true):
				if method.name.to_lower().contains(query):
					results.append({
						"type": "method",
						"class_name": class_name,
						"name": method.name,
						"description": "",
						"relevance": _calculate_relevance(method.name.to_lower(), query)
					})
					if results.size() >= limit:
						break
		
		# Search properties
		if "properties" in search_in:
			for prop in ClassDB.class_get_property_list(class_name, true):
				if prop.name.to_lower().contains(query) and prop.usage & PROPERTY_USAGE_EDITOR:
					results.append({
						"type": "property",
						"class_name": class_name,
						"name": prop.name,
						"description": "",
						"relevance": _calculate_relevance(prop.name.to_lower(), query)
					})
					if results.size() >= limit:
						break
		
		# Search signals
		if "signals" in search_in:
			for sig in ClassDB.class_get_signal_list(class_name, true):
				if sig.name.to_lower().contains(query):
					results.append({
						"type": "signal",
						"class_name": class_name,
						"name": sig.name,
						"description": "",
						"relevance": _calculate_relevance(sig.name.to_lower(), query)
					})
					if results.size() >= limit:
						break
	
	# Sort by relevance
	results.sort_custom(func(a, b): return a.relevance > b.relevance)
	
	return {
		"success": true,
		"query": query,
		"results": results.slice(0, limit),
		"total_count": results.size()
	}


func _build_class_docs(class_name: String, include_inherited: bool) -> Dictionary:
	var doc := {
		"success": true,
		"class_name": class_name,
		"inherits": ClassDB.get_parent_class(class_name),
		"brief_description": "",
		"description": "",
		"methods": [],
		"properties": [],
		"signals": [],
		"enums": [],
		"constants": []
	}
	
	# Get methods
	for method in ClassDB.class_get_method_list(class_name, !include_inherited):
		if not method.name.begins_with("_") or method.name == "_init" or method.name == "_ready" or method.name == "_process" or method.name == "_physics_process":
			doc.methods.append(_format_method(method))
	
	# Get properties
	for prop in ClassDB.class_get_property_list(class_name, !include_inherited):
		if prop.usage & PROPERTY_USAGE_EDITOR and not prop.name.begins_with("_"):
			doc.properties.append(_format_property(class_name, prop))
	
	# Get signals
	for sig in ClassDB.class_get_signal_list(class_name, !include_inherited):
		doc.signals.append(_format_signal(sig))
	
	# Get integer constants (often enums)
	for constant in ClassDB.class_get_integer_constant_list(class_name, !include_inherited):
		doc.constants.append({
			"name": constant,
			"value": ClassDB.class_get_integer_constant(class_name, constant)
		})
	
	return doc


func _format_method(method: Dictionary) -> Dictionary:
	var args: Array[Dictionary] = []
	for arg in method.args:
		args.append({
			"name": arg.name,
			"type": _type_to_string(arg.type),
			"default": null
		})
	
	return {
		"name": method.name,
		"return_type": _type_to_string(method.return.type),
		"description": "",
		"arguments": args
	}


func _format_property(class_name: String, prop: Dictionary) -> Dictionary:
	var default_value = ClassDB.class_get_property_default_value(class_name, prop.name)
	
	return {
		"name": prop.name,
		"type": _type_to_string(prop.type),
		"description": "",
		"default": str(default_value) if default_value != null else null,
		"hint": prop.hint,
		"hint_string": prop.hint_string
	}


func _format_signal(sig: Dictionary) -> Dictionary:
	var args: Array[Dictionary] = []
	for arg in sig.args:
		args.append({
			"name": arg.name,
			"type": _type_to_string(arg.type)
		})
	
	return {
		"name": sig.name,
		"description": "",
		"arguments": args
	}


func _type_to_string(type: int) -> String:
	match type:
		TYPE_NIL: return "void"
		TYPE_BOOL: return "bool"
		TYPE_INT: return "int"
		TYPE_FLOAT: return "float"
		TYPE_STRING: return "String"
		TYPE_VECTOR2: return "Vector2"
		TYPE_VECTOR2I: return "Vector2i"
		TYPE_RECT2: return "Rect2"
		TYPE_RECT2I: return "Rect2i"
		TYPE_VECTOR3: return "Vector3"
		TYPE_VECTOR3I: return "Vector3i"
		TYPE_TRANSFORM2D: return "Transform2D"
		TYPE_VECTOR4: return "Vector4"
		TYPE_VECTOR4I: return "Vector4i"
		TYPE_PLANE: return "Plane"
		TYPE_QUATERNION: return "Quaternion"
		TYPE_AABB: return "AABB"
		TYPE_BASIS: return "Basis"
		TYPE_TRANSFORM3D: return "Transform3D"
		TYPE_PROJECTION: return "Projection"
		TYPE_COLOR: return "Color"
		TYPE_STRING_NAME: return "StringName"
		TYPE_NODE_PATH: return "NodePath"
		TYPE_RID: return "RID"
		TYPE_OBJECT: return "Object"
		TYPE_CALLABLE: return "Callable"
		TYPE_SIGNAL: return "Signal"
		TYPE_DICTIONARY: return "Dictionary"
		TYPE_ARRAY: return "Array"
		TYPE_PACKED_BYTE_ARRAY: return "PackedByteArray"
		TYPE_PACKED_INT32_ARRAY: return "PackedInt32Array"
		TYPE_PACKED_INT64_ARRAY: return "PackedInt64Array"
		TYPE_PACKED_FLOAT32_ARRAY: return "PackedFloat32Array"
		TYPE_PACKED_FLOAT64_ARRAY: return "PackedFloat64Array"
		TYPE_PACKED_STRING_ARRAY: return "PackedStringArray"
		TYPE_PACKED_VECTOR2_ARRAY: return "PackedVector2Array"
		TYPE_PACKED_VECTOR3_ARRAY: return "PackedVector3Array"
		TYPE_PACKED_COLOR_ARRAY: return "PackedColorArray"
		_: return "Variant"


func _find_similar_classes(name: String) -> Array[String]:
	var similar: Array[String] = []
	var name_lower := name.to_lower()
	
	for class_name in ClassDB.get_class_list():
		if class_name.to_lower().contains(name_lower) or name_lower.contains(class_name.to_lower()):
			similar.append(class_name)
			if similar.size() >= 5:
				break
	
	return similar


func _calculate_relevance(text: String, query: String) -> float:
	if text == query:
		return 1.0
	if text.begins_with(query):
		return 0.9
	if text.contains(query):
		return 0.7
	return 0.5


func _error(code: int, message: String, data: Variant = null) -> Dictionary:
	var error := {
		"code": code,
		"message": message
	}
	if data != null:
		error["data"] = data
	return { "error": error }
