Place your managed-Postgres CA certificate here, e.g. `aiven-ca.pem`.

This directory is gitignored (except this file) so the certificate never gets
committed. See the "Using a managed Postgres provider" section in the top-level
README for how `DATABASE_URL` should reference it.
