import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Clock, Calendar, MapPin } from "lucide-react";
import { format } from "date-fns";

export default function MovieDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [movie, setMovie] = useState<any>(null);
  const [showtimes, setShowtimes] = useState<any[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    fetchMovieDetails();

    return () => subscription.unsubscribe();
  }, [id]);

  const fetchMovieDetails = async () => {
    const { data: movieData } = await supabase
      .from("movies")
      .select("*")
      .eq("id", id)
      .single();

    if (movieData) {
      setMovie(movieData);

      const { data: showtimesData } = await supabase
        .from("showtimes")
        .select("*")
        .eq("movie_id", id)
        .gte("show_date", new Date().toISOString().split("T")[0])
        .order("show_date")
        .order("show_time");

      if (showtimesData) {
        setShowtimes(showtimesData);
      }
    }
  };

  const handleBooking = (showtimeId: string) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    navigate(`/seats/${showtimeId}`);
  };

  if (!movie) {
    return (
      <div className="min-h-screen bg-background">
        <Header user={user} />
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} />

      {/* Movie Banner */}
      <div className="relative h-[500px] overflow-hidden">
        {movie.banner_url ? (
          <img src={movie.banner_url} alt={movie.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="container mx-auto">
            <div className="flex gap-8 items-end">
              <div className="w-48 aspect-[2/3] bg-card rounded-lg overflow-hidden shadow-2xl">
                {movie.poster_url ? (
                  <img src={movie.poster_url} alt={movie.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-6xl">
                    🎬
                  </div>
                )}
              </div>
              
              <div className="flex-1 pb-4">
                <h1 className="text-5xl font-bold mb-4">{movie.title}</h1>
                <div className="flex gap-3 mb-4">
                  <Badge variant="secondary">{movie.rating}</Badge>
                  <Badge variant="outline">{movie.genre}</Badge>
                  <Badge variant="outline" className="gap-1">
                    <Clock className="w-3 h-3" />
                    {movie.duration} min
                  </Badge>
                </div>
                <p className="text-lg text-muted-foreground max-w-3xl">
                  {movie.description}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Showtimes */}
      <div className="container mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold mb-8">Select Showtime</h2>
        
        {showtimes.length > 0 ? (
          <div className="grid gap-4 max-w-4xl">
            {showtimes.map((showtime) => (
              <Card key={showtime.id} className="hover:border-primary transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-muted-foreground" />
                        <span className="font-semibold">
                          {format(new Date(showtime.show_date), "EEEE, MMMM d, yyyy")}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-muted-foreground" />
                        <span>{showtime.show_time}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <MapPin className="w-5 h-5 text-muted-foreground" />
                        <span>{showtime.theater_name}</span>
                      </div>
                    </div>
                    
                    <div className="text-right space-y-2">
                      <div className="text-2xl font-bold text-primary">
                        ${showtime.price}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {showtime.available_seats} seats available
                      </div>
                      <Button
                        onClick={() => handleBooking(showtime.id)}
                        disabled={showtime.available_seats === 0}
                      >
                        Book Seats
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No showtimes available</p>
          </div>
        )}
      </div>
    </div>
  );
}
