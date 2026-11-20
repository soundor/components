//! The controller, tested in plain Rust: `cargo test --manifest-path lib/Cargo.toml`.

use soundor_components_demos::PluginController;
use soundor::testing::TestController;

#[test]
fn starts_with_empty_stores() {
    let controller = TestController::<PluginController>::new();
    // With `use soundor::prelude::*;`, a synchronous method:
    // `controller.task(PluginController::method)`; an async one:
    // `controller.block_on(PluginController::method(controller.async_context()))`.
    controller.task(|ctx| assert_eq!(ctx.plugin.name, soundor::config::PLUGIN_NAME));
}
