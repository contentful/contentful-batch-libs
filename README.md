# Contentful Batch Libs

Modules used on Contentful's JS batch operation tools.

At the moment this module is just some extracted parts of [contentful-space-sync](https://github.com/contentful/contentful-space-sync)
and while these parts are fairly independent, they might not be easy to
understand and use for your own projects right now.

Each module has more extensive documentation in the code regarding their own purpose.

## "Get" Modules

### getSourceSpace

Used to get content from a space, intended to be copied somewhere else, or manipulated.

### getOutdatedDestinationContent

Gets content from a space which will have content copied to it, based on a collection
of existing content.

## "Push" Modules

### creation

Entity creation methods.

### assets

Asset processing methods.

### deletion

Entity deletion methods.

### publishing

Entity publishing methods.

### pushToSpace

Pushes all changes, including deletions, to a given space. Handles (un)publishing
as well as delays after creation and before publishing.

Creates everything in the right order so that a content type for a given entry
is there when entry creation for that content type is attempted.

Allows only content model or only content pushing.

## "Transform" Modules

### transformSpace

Transforms all the content from a space, in order to ready it to be sent to another space.

### transformers

Transformer methods for each kind of entity.

## Utils

### createClients

Creates delivery and management client instances for both source and destination spaces.

### errorBuffer

Gathers errors in an internal buffer which can then be drained in order to output them to a user.

# Changelog

Check out the [releases](https://github.com/contentful/contentful-space-sync/releases) page.
