-- Create feedback table
CREATE TABLE public.feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert feedback (authenticated or not)
CREATE POLICY "Anyone can submit feedback"
ON public.feedback
FOR INSERT
WITH CHECK (true);

-- Allow users to view all feedback
CREATE POLICY "Anyone can view feedback"
ON public.feedback
FOR SELECT
USING (true);

-- Allow users to update their own feedback
CREATE POLICY "Users can update own feedback"
ON public.feedback
FOR UPDATE
USING (auth.uid() = user_id);

-- Allow users to delete their own feedback
CREATE POLICY "Users can delete own feedback"
ON public.feedback
FOR DELETE
USING (auth.uid() = user_id);