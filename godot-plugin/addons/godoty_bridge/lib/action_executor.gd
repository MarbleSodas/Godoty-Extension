@tool
extends RefCounted
class_name GodotyActionExecutor

## Executes editor actions for Godoty

var enable_dangerous_actions: bool = false

# List of actions that require opt-in
const DANGEROUS_ACTIONS := ["delete_node", "clear_scene"]


func handle_execute_action(params: Dictionary) -> Dictionary:
	var action: String = params.get("action", "")
	var action_params: Dictionary = params.get("params", {})
	
	if action.is_empty():
		return _error(-32602, "Missing action parameter")
	
	# Check if action is dangerous and allowed
	if action in DANGEROUS_ACTIONS and not enable_dangerous_actions:
		return _error(-32002, "Action '%s' is disabled for safety. Enable dangerous actions in settings." % action)
	
	match action:
		"run_scene":
			return _run_scene(action_params)
		"run_main_scene":
			return _run_main_scene()
		"stop_scene":
			return _stop_scene()
		"pause_scene":
			return _pause_scene()
		"resume_scene":
			return _resume_scene()
		"select_node":
			return _select_node(action_params)
		"select_nodes":
			return _select_nodes(action_params)
		"focus_node":
			return _focus_node(action_params)
		"set_property":
			return _set_property(action_params)
		"create_node":
			return _create_node(action_params)
		"delete_node":
			return _delete_node(action_params)
		"save_scene":
			return _save_scene()
		"reload_scene":
			return _reload_scene()
		_:
			return _error(-32601, "Unknown action: %s" % action)


func _run_scene(params: Dictionary) -> Dictionary:
	var scene_path: String = params.get("scene_path", "")
	
	if scene_path.is_empty():
		# Run current scene
		EditorInterface.play_current_scene()
	else:
		EditorInterface.play_custom_scene(scene_path)
	
	return {
		"success": true,
		"action": "run_scene",
		"message": "Scene started"
	}


func _run_main_scene() -> Dictionary:
	EditorInterface.play_main_scene()
	return {
		"success": true,
		"action": "run_main_scene",
		"message": "Main scene started"
	}


func _stop_scene() -> Dictionary:
	EditorInterface.stop_playing_scene()
	return {
		"success": true,
		"action": "stop_scene",
		"message": "Scene stopped"
	}


func _pause_scene() -> Dictionary:
	EditorInterface.set_playing_scene_paused(true)
	return {
		"success": true,
		"action": "pause_scene",
		"message": "Scene paused"
	}


func _resume_scene() -> Dictionary:
	EditorInterface.set_playing_scene_paused(false)
	return {
		"success": true,
		"action": "resume_scene",
		"message": "Scene resumed"
	}


func _select_node(params: Dictionary) -> Dictionary:
	var node_path: String = params.get("node_path", "")
	
	if node_path.is_empty():
		return _error(-32602, "Missing node_path parameter")
	
	var edited_scene := EditorInterface.get_edited_scene_root()
	if not edited_scene:
		return _error(-32000, "No scene is currently open")
	
	var node := edited_scene.get_node_or_null(node_path)
	if not node:
		return _error(-32000, "Node not found: %s" % node_path)
	
	var selection := EditorInterface.get_selection()
	selection.clear()
	selection.add_node(node)
	
	return {
		"success": true,
		"action": "select_node",
		"message": "Selected node: %s" % node_path
	}


func _select_nodes(params: Dictionary) -> Dictionary:
	var node_paths: Array = params.get("node_paths", [])
	
	if node_paths.is_empty():
		return _error(-32602, "Missing node_paths parameter")
	
	var edited_scene := EditorInterface.get_edited_scene_root()
	if not edited_scene:
		return _error(-32000, "No scene is currently open")
	
	var selection := EditorInterface.get_selection()
	selection.clear()
	
	var selected_count := 0
	for path in node_paths:
		var node := edited_scene.get_node_or_null(path)
		if node:
			selection.add_node(node)
			selected_count += 1
	
	return {
		"success": true,
		"action": "select_nodes",
		"message": "Selected %d nodes" % selected_count
	}


func _focus_node(params: Dictionary) -> Dictionary:
	var node_path: String = params.get("node_path", "")
	
	if node_path.is_empty():
		return _error(-32602, "Missing node_path parameter")
	
	# First select the node
	var select_result := _select_node(params)
	if select_result.has("error"):
		return select_result
	
	# Then focus on it in the editor (scroll to it in scene tree)
	EditorInterface.edit_node(EditorInterface.get_edited_scene_root().get_node(node_path))
	
	return {
		"success": true,
		"action": "focus_node",
		"message": "Focused on node: %s" % node_path
	}


func _set_property(params: Dictionary) -> Dictionary:
	var node_path: String = params.get("node_path", "")
	var property: String = params.get("property", "")
	var value: Variant = params.get("value", null)
	
	if node_path.is_empty():
		return _error(-32602, "Missing node_path parameter")
	if property.is_empty():
		return _error(-32602, "Missing property parameter")
	
	var edited_scene := EditorInterface.get_edited_scene_root()
	if not edited_scene:
		return _error(-32000, "No scene is currently open")
	
	var node := edited_scene.get_node_or_null(node_path)
	if not node:
		return _error(-32000, "Node not found: %s" % node_path)
	
	# Parse value if it's a string representation of a Godot type
	var parsed_value = _parse_value(value)
	
	# Set the property using UndoRedo for proper undo support
	var undo_redo := EditorInterface.get_editor_undo_redo()
	undo_redo.create_action("Godoty: Set %s" % property)
	undo_redo.add_do_property(node, property, parsed_value)
	undo_redo.add_undo_property(node, property, node.get(property))
	undo_redo.commit_action()
	
	return {
		"success": true,
		"action": "set_property",
		"message": "Set %s.%s = %s" % [node_path, property, str(parsed_value)]
	}


func _create_node(params: Dictionary) -> Dictionary:
	var parent_path: String = params.get("parent_path", "")
	var node_type: String = params.get("node_type", "")
	var node_name: String = params.get("name", "")
	
	if node_type.is_empty():
		return _error(-32602, "Missing node_type parameter")
	
	var edited_scene := EditorInterface.get_edited_scene_root()
	if not edited_scene:
		return _error(-32000, "No scene is currently open")
	
	var parent: Node = edited_scene
	if not parent_path.is_empty():
		parent = edited_scene.get_node_or_null(parent_path)
		if not parent:
			return _error(-32000, "Parent node not found: %s" % parent_path)
	
	# Create the new node
	if not ClassDB.class_exists(node_type):
		return _error(-32001, "Unknown node type: %s" % node_type)
	
	var new_node = ClassDB.instantiate(node_type)
	if not new_node:
		return _error(-32000, "Failed to create node of type: %s" % node_type)
	
	if not node_name.is_empty():
		new_node.name = node_name
	
	# Add with undo support
	var undo_redo := EditorInterface.get_editor_undo_redo()
	undo_redo.create_action("Godoty: Create %s" % node_type)
	undo_redo.add_do_method(parent, "add_child", new_node, true)
	undo_redo.add_do_property(new_node, "owner", edited_scene)
	undo_redo.add_do_reference(new_node)
	undo_redo.add_undo_method(parent, "remove_child", new_node)
	undo_redo.commit_action()
	
	return {
		"success": true,
		"action": "create_node",
		"message": "Created node: %s" % str(new_node.get_path()),
		"data": {
			"path": str(new_node.get_path()),
			"type": node_type
		}
	}


func _delete_node(params: Dictionary) -> Dictionary:
	var node_path: String = params.get("node_path", "")
	
	if node_path.is_empty():
		return _error(-32602, "Missing node_path parameter")
	
	var edited_scene := EditorInterface.get_edited_scene_root()
	if not edited_scene:
		return _error(-32000, "No scene is currently open")
	
	var node := edited_scene.get_node_or_null(node_path)
	if not node:
		return _error(-32000, "Node not found: %s" % node_path)
	
	if node == edited_scene:
		return _error(-32002, "Cannot delete scene root node")
	
	var parent := node.get_parent()
	
	# Delete with undo support
	var undo_redo := EditorInterface.get_editor_undo_redo()
	undo_redo.create_action("Godoty: Delete %s" % node.name)
	undo_redo.add_do_method(parent, "remove_child", node)
	undo_redo.add_undo_method(parent, "add_child", node, true)
	undo_redo.add_undo_property(node, "owner", edited_scene)
	undo_redo.add_undo_reference(node)
	undo_redo.commit_action()
	
	return {
		"success": true,
		"action": "delete_node",
		"message": "Deleted node: %s" % node_path
	}


func _save_scene() -> Dictionary:
	var edited_scene := EditorInterface.get_edited_scene_root()
	if not edited_scene:
		return _error(-32000, "No scene is currently open")
	
	EditorInterface.save_scene()
	
	return {
		"success": true,
		"action": "save_scene",
		"message": "Scene saved"
	}


func _reload_scene() -> Dictionary:
	EditorInterface.reload_scene_from_path(EditorInterface.get_edited_scene_root().scene_file_path)
	
	return {
		"success": true,
		"action": "reload_scene",
		"message": "Scene reloaded"
	}


func _parse_value(value: Variant) -> Variant:
	if value is String:
		# Try to parse common Godot types from string representation
		var s := value as String
		
		# Vector2
		var v2_regex := RegEx.new()
		v2_regex.compile(r"Vector2\s*\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)")
		var v2_match := v2_regex.search(s)
		if v2_match:
			return Vector2(float(v2_match.get_string(1)), float(v2_match.get_string(2)))
		
		# Vector3
		var v3_regex := RegEx.new()
		v3_regex.compile(r"Vector3\s*\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)")
		var v3_match := v3_regex.search(s)
		if v3_match:
			return Vector3(float(v3_match.get_string(1)), float(v3_match.get_string(2)), float(v3_match.get_string(3)))
		
		# Color
		var color_regex := RegEx.new()
		color_regex.compile(r"Color\s*\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*(?:,\s*([-\d.]+))?\s*\)")
		var color_match := color_regex.search(s)
		if color_match:
			var a := float(color_match.get_string(4)) if color_match.get_string(4) else 1.0
			return Color(float(color_match.get_string(1)), float(color_match.get_string(2)), float(color_match.get_string(3)), a)
		
		# Boolean
		if s.to_lower() == "true":
			return true
		if s.to_lower() == "false":
			return false
		
		# Try as number
		if s.is_valid_float():
			return float(s)
		if s.is_valid_int():
			return int(s)
	
	return value


func _error(code: int, message: String, data: Variant = null) -> Dictionary:
	var error := {
		"code": code,
		"message": message
	}
	if data != null:
		error["data"] = data
	return { "error": error }
