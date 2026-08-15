-- Make newly-created tables, columns, functions, and relationships immediately
-- visible to PostgREST after the preceding additive migrations are committed.
notify pgrst, 'reload schema';
