//! The plugin's controller: the Rust behind `soundor:native`'s methods,
//! on the control thread beside the UI. Each method soundor.config declares
//! is one here, typed as declared (the compiler checks every one of them,
//! from the generated `NativeMethods`); a synchronous one gets a
//! `TaskContext`, an `async: true` one an `AsyncTaskContext`.

use soundor::prelude::*;

/// What the controller keeps on the control thread, between calls: one per
/// plugin instance, for as long as it lives. Not saved with the plugin; use
/// soundor.config's `state` for that.
#[derive(Default)]
pub struct LocalStore {}

/// What async tasks share with the control thread, from any thread.
#[derive(Default)]
pub struct SharedStore {}

/// The plugin's controller. Soundor never constructs it: its methods take
/// their context, and keep what lasts in the stores.
pub struct PluginController;

impl Controller for PluginController {
    type Local = LocalStore;
    type Shared = SharedStore;
}
