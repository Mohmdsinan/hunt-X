ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS is_finalist boolean NOT NULL DEFAULT false;

ALTER TABLE public.teams
  ALTER COLUMN is_finalist SET DEFAULT false;

UPDATE public.teams
SET is_finalist = false
WHERE is_finalist IS NULL;

ALTER TABLE public.teams
  ALTER COLUMN is_finalist SET NOT NULL;

CREATE OR REPLACE FUNCTION public.enforce_tx00_finalist_scan()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  team_is_finalist boolean;
BEGIN
  IF upper(trim(NEW.question_code)) = 'TX-00' THEN
    SELECT is_finalist
    INTO team_is_finalist
    FROM public.teams
    WHERE id = NEW.team_id
    FOR UPDATE;

    IF NOT FOUND OR NOT COALESCE(team_is_finalist, false) THEN
      RAISE EXCEPTION 'NOT_QUALIFIED_FOR_FINAL';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.team_qr_scans
      WHERE team_id = NEW.team_id
        AND upper(trim(question_code)) = 'TX-00'
    ) THEN
      RAISE EXCEPTION 'ALREADY_SCANNED';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_tx00_finalist_scan ON public.team_qr_scans;

CREATE TRIGGER enforce_tx00_finalist_scan
BEFORE INSERT ON public.team_qr_scans
FOR EACH ROW
EXECUTE FUNCTION public.enforce_tx00_finalist_scan();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.team_qr_scans
    WHERE upper(trim(question_code)) = 'TX-00'
    GROUP BY team_id
    HAVING count(*) > 1
  ) THEN
    EXECUTE
      'CREATE UNIQUE INDEX IF NOT EXISTS team_qr_scans_one_tx00_per_team
       ON public.team_qr_scans (team_id)
       WHERE upper(trim(question_code)) = ''TX-00''';
  END IF;
END;
$$;
