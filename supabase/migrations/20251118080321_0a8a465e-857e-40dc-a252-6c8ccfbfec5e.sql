-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Create movies table
CREATE TABLE public.movies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  poster_url TEXT,
  banner_url TEXT,
  duration INTEGER NOT NULL,
  genre TEXT NOT NULL,
  rating TEXT,
  release_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.movies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view movies"
  ON public.movies FOR SELECT
  USING (true);

-- Create showtimes table
CREATE TABLE public.showtimes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  movie_id UUID NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE,
  show_date DATE NOT NULL,
  show_time TIME NOT NULL,
  theater_name TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  total_seats INTEGER NOT NULL DEFAULT 100,
  available_seats INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.showtimes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view showtimes"
  ON public.showtimes FOR SELECT
  USING (true);

-- Create seats table
CREATE TABLE public.seats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  showtime_id UUID NOT NULL REFERENCES public.showtimes(id) ON DELETE CASCADE,
  seat_number TEXT NOT NULL,
  row_letter TEXT NOT NULL,
  is_booked BOOLEAN DEFAULT FALSE,
  booking_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(showtime_id, seat_number, row_letter)
);

ALTER TABLE public.seats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view seats"
  ON public.seats FOR SELECT
  USING (true);

-- Create bookings table
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  showtime_id UUID NOT NULL REFERENCES public.showtimes(id),
  total_amount DECIMAL(10, 2) NOT NULL,
  booking_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bookings"
  ON public.bookings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create booking_seats junction table
CREATE TABLE public.booking_seats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  seat_id UUID NOT NULL REFERENCES public.seats(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(booking_id, seat_id)
);

ALTER TABLE public.booking_seats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their booking seats"
  ON public.booking_seats FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings
      WHERE bookings.id = booking_seats.booking_id
      AND bookings.user_id = auth.uid()
    )
  );

-- Add foreign key for seats.booking_id
ALTER TABLE public.seats 
  ADD CONSTRAINT fk_seats_booking 
  FOREIGN KEY (booking_id) 
  REFERENCES public.bookings(id) 
  ON DELETE SET NULL;

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert sample movies
INSERT INTO public.movies (title, description, poster_url, banner_url, duration, genre, rating, release_date) VALUES
('The Cosmic Journey', 'An epic space adventure that takes you across the galaxy in search of a lost civilization.', '', '', 148, 'Sci-Fi', 'PG-13', '2024-01-15'),
('Midnight Chase', 'A thrilling action-packed chase through the city streets as detective hunts a master criminal.', '', '', 132, 'Action', 'R', '2024-02-20'),
('Love in Paris', 'A heartwarming romantic comedy set in the beautiful streets of Paris.', '', '', 115, 'Romance', 'PG', '2024-03-10'),
('Dark Shadows', 'A psychological horror that will keep you on the edge of your seat.', '', '', 105, 'Horror', 'R', '2024-02-05'),
('The Last Stand', 'Heroes unite for one final battle to save humanity from extinction.', '', '', 156, 'Action', 'PG-13', '2024-01-25');

-- Create function to initialize seats for a showtime
CREATE OR REPLACE FUNCTION public.initialize_seats(p_showtime_id UUID, p_total_seats INTEGER)
RETURNS VOID AS $$
DECLARE
  v_row_letter TEXT;
  v_seat_num INTEGER;
  v_rows INTEGER;
  v_seats_per_row INTEGER;
BEGIN
  -- Calculate rows and seats per row (e.g., 100 seats = 10 rows × 10 seats)
  v_rows := CEIL(SQRT(p_total_seats));
  v_seats_per_row := CEIL(p_total_seats::FLOAT / v_rows);
  
  FOR i IN 1..v_rows LOOP
    v_row_letter := CHR(64 + i); -- A, B, C, etc.
    
    FOR j IN 1..v_seats_per_row LOOP
      IF (i - 1) * v_seats_per_row + j <= p_total_seats THEN
        INSERT INTO public.seats (showtime_id, seat_number, row_letter, is_booked)
        VALUES (p_showtime_id, j::TEXT, v_row_letter, FALSE);
      END IF;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;