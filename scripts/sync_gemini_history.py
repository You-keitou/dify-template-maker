
import json
import os
import glob
from datetime import datetime

def get_gemini_history_files():
    # Gemini CLIの履歴ファイルが保存されている可能性のあるパス
    gemini_tmp_dir = os.path.expanduser("~/.gemini/tmp/")
    history_files = []
    if os.path.exists(gemini_tmp_dir):
        # 各セッションIDディレクトリ内のlogs.jsonを探す
        for session_dir in glob.glob(os.path.join(gemini_tmp_dir, "*")):
            log_file = os.path.join(session_dir, "logs.json")
            if os.path.exists(log_file):
                history_files.append(log_file)
    return history_files

def convert_gemini_to_standard_format(gemini_history_data):
    standard_sessions = {}

    for entry in gemini_history_data:
        session_id = entry.get("sessionId")
        if not session_id:
            continue

        if session_id not in standard_sessions:
            standard_sessions[session_id] = {
                "session": {
                    "id": session_id,
                    "tool": "gemini-cli",
                    "timestamp": entry.get("timestamp"), # 最初のメッセージのタイムスタンプ
                    "project": os.path.basename(os.getcwd()) # プロジェクト名は現在のディレクトリ名から推測
                },
                "conversations": [],
                "metadata": {
                    "files_modified": [],
                    "commands_executed": [],
                    "insights": []
                }
            }

        standard_sessions[session_id]["conversations"].append({
            "role": entry.get("type"),
            "content": entry.get("message"),
            "timestamp": entry.get("timestamp"),
            "message_id": entry.get("messageId")
        })
    
    # 各セッションのconversationsをtimestampでソート
    for session_id in standard_sessions:
        standard_sessions[session_id]["conversations"].sort(key=lambda x: x["timestamp"])
        # セッションのタイムスタンプを最初のメッセージのタイムスタンプに設定
        if standard_sessions[session_id]["conversations"]:
            standard_sessions[session_id]["session"]["timestamp"] = standard_sessions[session_id]["conversations"][0]["timestamp"]

    return list(standard_sessions.values())

def save_standard_history(standard_history_data, output_dir):
    for session_data in standard_history_data:
        session_id = session_data["session"]["id"]
        # ファイル名をセッションIDとタイムスタンプで生成
        timestamp_str = datetime.strptime(session_data["session"]["timestamp"], "%Y-%m-%dT%H:%M:%S.%fZ").strftime("%Y%m%d%H%M%S")
        output_filename = f"gemini_session_{timestamp_str}_{session_id}.json"
        output_path = os.path.join(output_dir, output_filename)
        
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(session_data, f, ensure_ascii=False, indent=2)
        print(f"Saved: {output_path}")

if __name__ == "__main__":
    history_files = get_gemini_history_files()
    
    all_gemini_history_data = []
    for file_path in history_files:
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                all_gemini_history_data.extend(json.load(f))
        except json.JSONDecodeError as e:
            print(f"Error decoding JSON from {file_path}: {e}")
        except Exception as e:
            print(f"Error reading {file_path}: {e}")

    if all_gemini_history_data:
        standard_format_data = convert_gemini_to_standard_format(all_gemini_history_data)
        output_directory = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".cli-history")
        save_standard_history(standard_format_data, output_directory)
    else:
        print("No Gemini CLI history found.")
