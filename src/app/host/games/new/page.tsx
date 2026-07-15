import { CreateGameForm } from "@/components/games/create-game-form";
import { getInvitableRegisteredPlayers } from "@/lib/queries/players";
import { getAllPlatformSettings } from "@/lib/settings";
import { requireRole } from "@/lib/auth/session";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function NewGamePage() {
  const host = await requireRole("host");
  const settings = await getAllPlatformSettings();
  const registeredPlayers = await getInvitableRegisteredPlayers({ hostUserId: host.id });

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Create a cash game</CardTitle>
        <CardDescription>
          You are automatically seated as host. Select registered players or add emails for
          people not on House Poker yet.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <CreateGameForm
          registeredPlayers={registeredPlayers}
          defaults={{
            currency: settings.default_currency,
            defaultBuyIn: settings.default_buy_in,
            maxPlayers: settings.default_max_players,
          }}
        />
      </CardContent>
    </Card>
  );
}
