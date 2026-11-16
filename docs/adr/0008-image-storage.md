# 0008. Image storage

- Status: Accepted
- Date: 2026-11-16

## Context

An event has an optional cover and an album of photos. In the old app the client uploaded to hosted storage and was the only place that checked type, the 50-photo cap, and the time window. Album photos are for the owner and attendees. Camera EXIF can carry GPS, which the product must not keep.

## Decision

Store objects in Azure Blob Storage. Containers are private.

The client uploads directly. It first asks the API for a short-lived, write-only SAS. The API issues that SAS only after the permission check and the time-window check pass. Cover and album photos use the same flow. The API stores the blob name on the event or the photo ([ADR 0003](0003-data-model.md)).

Reads use a short-lived read SAS or an API proxy. The container is private on either path. A guessed URL must not return the object.

The upload window is the inventory rule: the owner or Attendance `attending`, from two hours before `start_at`, and still after the event has ended. The owner may delete any album photo. An attendee may delete only their own. The API enforces 50 album photos per user per event.

On upload confirmation, in this API process:

- Strip EXIF metadata, including GPS, before any read SAS is issued for that blob.
- Enforce a maximum size and an image content-type allow-list.
- Generate thumbnails.

v1 adds no Function, queue, or separate image service for this.

## Consequences

- Upload traffic goes to Blob. The API handles the SAS, the confirmation, and the thumbnail pass.
- In-process thumbnails keep a single deployable ([ADR 0002](0002-stack-and-modular-monolith.md)). The size cap is what keeps that work bounded.
- Integration tests can use a local storage stand-in. They still assert that an anonymous or non-attendee read fails.

## Open

- The numeric size cap and the exact content-type allow-list.
- Whether the post-end upload window ever closes. Until it does, owner and attendees may upload after `end_at`.
