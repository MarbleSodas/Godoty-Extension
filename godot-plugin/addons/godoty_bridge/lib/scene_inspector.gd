@tool
extends RefCounted
class_name GodotySceneInspector

## Scene tree and node property inspection for Godoty


func handle_get_scene_tree(params: Dictionary) -> Dictionary:
	var root_path: String = params.get("root_path", "/root")
	var max_depth: int = params.get("max_depth", -1)
	var include_properties: bool = params.get("include_properties", false)
	
	var edited_scene := EditorInterface.get_edited_scene_root()
	if not edited_scene:
		return _error(-32000, "No scene is currently open")
	
	var scene_tree := _build_tree(edited_scene, 0, max_depth, include_properties)
	
	return {
		"success": true,
		"scene_path": edited_scene.scene_file_path,
		"root": scene_tree,
		"timestamp": Time.get_unix_time_from_system()
	}


func handle_get_node_properties(params: Dictionary) -> Dictionary:
	var node_path: String = params.get("node_path", "")
	var property_filter: Array = params.get("property_filter", [])
	
	if node_path.is_empty():
		return _error(-32602, "Missing node_path parameter")
	
	var edited_scene := EditorInterface.get_edited_scene_root()
	if not edited_scene:
		return _error(-32000, "No scene is currently open")
	
	var node := edited_scene.get_node_or_null(node_path)
	if not node:
		return _error(-32000, "Node not found: %s" % node_path)
	
	var properties := _get_node_properties(node, property_filter)
	
	return {
		"success": true,
		"node_path": node_path,
		"node_type": node.get_class(),
		"script": node.get_script().resource_path if node.get_script() else null,
		"properties": properties,
		"timestamp": Time.get_unix_time_from_system()
	}


func handle_get_selected_nodes(params: Dictionary) -> Dictionary:
	var include_properties: bool = params.get("include_properties", false)
	
	var selection := EditorInterface.get_selection()
	var selected_nodes := selection.get_selected_nodes()
	
	var nodes: Array[Dictionary] = []
	for node in selected_nodes:
		var node_data := {
			"name": node.name,
			"type": node.get_class(),
			"path": str(node.get_path()),
			"script": node.get_script().resource_path if node.get_script() else null
		}
		
		if include_properties:
			node_data["properties"] = _get_node_properties(node, [])
		
		nodes.append(node_data)
	
	return {
		"success": true,
		"selected_nodes": nodes,
		"count": nodes.size(),
		"timestamp": Time.get_unix_time_from_system()
	}


func _build_tree(node: Node, depth: int, max_depth: int, include_properties: bool) -> Dictionary:
	var node_data := {
		"name": node.name,
		"type": node.get_class(),
		"path": str(node.get_path()),
		"script": node.get_script().resource_path if node.get_script() else null,
		"children": []
	}
	
	if include_properties:
		node_data["properties"] = _get_node_properties(node, [])
	
	# Add children if within depth limit
	if max_depth < 0 or depth < max_depth:
		for child in node.get_children():
			node_data.children.append(_build_tree(child, depth + 1, max_depth, include_properties))
	
	return node_data


func _get_node_properties(node: Node, filter: Array) -> Dictionary:
	var properties := {}
	
	for prop in node.get_property_list():
		# Skip internal properties
		if not (prop.usage & PROPERTY_USAGE_EDITOR):
			continue
		
		# Skip if not in filter (when filter is provided)
		if filter.size() > 0 and not prop.name in filter:
			continue
		
		# Skip some common internal properties
		if prop.name in ["script", "Script Variables", "MultiplayerConfiguration"]:
			continue
		
		var value = node.get(prop.name)
		
		# Handle special types
		var serialized_value = _serialize_value(value)
		
		properties[prop.name] = {
			"type": _type_to_string(prop.type),
			"value": serialized_value,
			"category": prop.get("class_name", ""),
			"exported": (prop.usage & PROPERTY_USAGE_SCRIPT_VARIABLE) != 0
		}
	
	return properties


func _serialize_value(value: Variant) -> Variant:
	match typeof(value):
		TYPE_OBJECT:
			if value is Resource:
				return value.resource_path if value.resource_path else "<Resource>"
			return "<Object>"
		TYPE_VECTOR2, TYPE_VECTOR2I:
			return { "x": value.x, "y": value.y }
		TYPE_VECTOR3, TYPE_VECTOR3I:
			return { "x": value.x, "y": value.y, "z": value.z }
		TYPE_VECTOR4, TYPE_VECTOR4I:
			return { "x": value.x, "y": value.y, "z": value.z, "w": value.w }
		TYPE_COLOR:
			return { "r": value.r, "g": value.g, "b": value.b, "a": value.a }
		TYPE_RECT2, TYPE_RECT2I:
			return { "position": { "x": value.position.x, "y": value.position.y }, "size": { "x": value.size.x, "y": value.size.y } }
		TYPE_QUATERNION:
			return { "x": value.x, "y": value.y, "z": value.z, "w": value.w }
		TYPE_TRANSFORM2D:
			return str(value)
		TYPE_TRANSFORM3D:
			return str(value)
		TYPE_CALLABLE, TYPE_SIGNAL:
			return str(value)
		TYPE_NODE_PATH:
			return str(value)
		_:
			return value


func _type_to_string(type: int) -> String:
	match type:
		TYPE_NIL: return "void"
		TYPE_BOOL: return "bool"
		TYPE_INT: return "int"
		TYPE_FLOAT: return "float"
		TYPE_STRING: return "String"
		TYPE_VECTOR2: return "Vector2"
		TYPE_VECTOR3: return "Vector3"
		TYPE_COLOR: return "Color"
		TYPE_NODE_PATH: return "NodePath"
		TYPE_OBJECT: return "Object"
		TYPE_DICTIONARY: return "Dictionary"
		TYPE_ARRAY: return "Array"
		_: return "Variant"


func _error(code: int, message: String, data: Variant = null) -> Dictionary:
	var error := {
		"code": code,
		"message": message
	}
	if data != null:
		error["data"] = data
	return { "error": error }
