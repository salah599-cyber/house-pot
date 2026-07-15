import { CreateGameForm } from "@/components/games/create-game-form";
import { requireRole } from "@/lib/auth/session";
import { getAllPlatformSettings } from "@/lib/settings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function NewGamePage() {
  await requireRole("host");
  const settings = await getAllPlatformSettings();

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Create a cash game</CardTitle>
          <CardDescription>
            You are automatically seated as host. The first players to confirm online fill
            the remaining seats.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateGameForm
            defaults={{
              currency: settings.default_currency,
              defaultBuyIn: settings.default_buy_in,
              maxPlayers: settings.default_max_players,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
