import { Typography } from '@mui/material';
import { Freshness as F } from '../api/types';
import { useApp } from '../app/AppContext';
import { formatDateTime } from '../lib/time';

/** Occurrence time (when it happened on the device) is shown separately from receipt time (when the server got it). */
export function Freshness({ f }: { f: F }) {
  const { filters } = useApp();
  return (
    <Typography variant="caption" color="text.secondary" component="p" data-testid="freshness">
      Data freshness ({filters.tz}): latest event happened {formatDateTime(f.latestEventOccurredUtc, filters.tz)}; latest upload received {formatDateTime(f.latestUploadReceivedUtc, filters.tz)}.
      Events from offline devices are counted on the day they happened, even if uploaded later.
    </Typography>
  );
}
