-- Add SELECT policy for students to read exams by code
CREATE POLICY "Students can read exams by code"
ON public.exams FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Optional: More restrictive policy that only allows reading specific columns
-- CREATE POLICY "Students can read exam details by code"
-- ON public.exams FOR SELECT
-- USING (auth.uid() IS NOT NULL);