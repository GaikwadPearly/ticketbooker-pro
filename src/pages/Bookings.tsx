import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Clock, MapPin, Ticket } from "lucide-react";
import { format } from "date-fns";

export default function Bookings() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session?.user);
      fetchBookings(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session?.user);
        fetchBookings(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchBookings = async (userId: string) => {
    const { data, error } = await supabase
      .from("bookings")
      .select(`
        *,
        showtimes!inner(
          *,
          movies(*)
        ),
        booking_seats(
          seats(*)
        )
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setBookings(data);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} />

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">My Bookings</h1>

        {bookings.length > 0 ? (
          <div className="grid gap-6 max-w-4xl">
            {bookings.map((booking) => {
              const movie = booking.showtimes.movies;
              const showtime = booking.showtimes;
              const seats = Array.isArray(booking.booking_seats) 
                ? booking.booking_seats.map((bs: any) => bs.seats)
                : [];

              return (
                <Card key={booking.id} className="overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex gap-6">
                      <div className="w-32 aspect-[2/3] bg-secondary rounded-lg overflow-hidden flex-shrink-0">
                        {movie.poster_url ? (
                          <img
                            src={movie.poster_url}
                            alt={movie.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-4xl">
                            🎬
                          </div>
                        )}
                      </div>

                      <div className="flex-1 space-y-4">
                        <div>
                          <h3 className="text-2xl font-bold mb-2">{movie.title}</h3>
                          <div className="flex gap-2 mb-3">
                            <Badge variant="secondary">{movie.genre}</Badge>
                            <Badge
                              variant={booking.status === "confirmed" ? "default" : "secondary"}
                            >
                              {booking.status}
                            </Badge>
                          </div>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            <span>
                              {format(new Date(showtime.show_date), "EEEE, MMMM d, yyyy")}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="w-4 h-4" />
                            <span>{showtime.show_time}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="w-4 h-4" />
                            <span>{showtime.theater_name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Ticket className="w-4 h-4" />
                            <span>
                              Seats:{" "}
                              {seats
                                .map((s: any) => `${s.row_letter}${s.seat_number}`)
                                .join(", ")}
                            </span>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-border">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Total Amount</span>
                            <span className="text-2xl font-bold text-primary">
                              ${booking.total_amount}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Booked on {format(new Date(booking.booking_date), "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <Ticket className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-xl text-muted-foreground mb-2">No bookings yet</p>
            <p className="text-sm text-muted-foreground">
              Start browsing movies and book your first show!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
