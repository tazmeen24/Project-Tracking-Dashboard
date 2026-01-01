import os
import re

def fix_service_file(file_path):
    """Fix cursor_factory in service files"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Ensure sqlite3 is imported
        if 'import sqlite3' not in content and 'cursor_factory' in content:
            # Add after other imports
            content = re.sub(
                r'(import psycopg2\n)',
                r'\1import sqlite3\n',
                content
            )
        
        # Remove RealDictCursor import if still there
        content = re.sub(
            r'from psycopg2\.extras import RealDictCursor\n?',
            '',
            content
        )
        
        # Fix: with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
        content = re.sub(
            r'(\s+)with self\.conn\.cursor\(cursor_factory=RealDictCursor\) as (\w+):',
            r'\1self.conn.row_factory = sqlite3.Row\n\1with self.conn.cursor() as \2:',
            content
        )
        
        # Fix: cursor = self.conn.cursor(cursor_factory=RealDictCursor)
        content = re.sub(
            r'(\s+)(\w+) = self\.conn\.cursor\(cursor_factory=RealDictCursor\)',
            r'\1self.conn.row_factory = sqlite3.Row\n\1\2 = self.conn.cursor()',
            content
        )
        
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        
        return False
    
    except Exception as e:
        print(f"Error in {file_path}: {e}")
        return False

# Fix all service files
service_files = [
    'app/services/dashboard_service.py',
    'app/services/expenditure_service.py',
    'app/services/funds_service.py',
    'app/services/project_service.py',
    'app/services/reports_service.py',
]

print("Fixing service files...\n")
for file in service_files:
    if os.path.exists(file):
        if fix_service_file(file):
            print(f"✓ Fixed: {file}")
        else:
            print(f"- No changes: {file}")
    else:
        print(f"✗ Not found: {file}")

print("\nDone! Restart your backend and IDE.")