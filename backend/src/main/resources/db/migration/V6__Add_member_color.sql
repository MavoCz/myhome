-- Add color column to family_members for consistent member colors in charts
ALTER TABLE family_members ADD COLUMN member_color VARCHAR(7);
