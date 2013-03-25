{component name="space.threejs"}
{* dependency name="utils.phy2" *}
{dependency name="physics.cyclone"}
{dependency name="physics.processors"}
{dependency name="physics.forces"}
{dependency name="physics.collisions"}
{dependency name="physics.visualizer"}
{dependency name="ui.select"}
{dependency name="deepzoom.image"}
{dependency name="deepzoom.canvas"}
{dependency name="space.controls"}
{dependency name="space.thing"}
{dependency name="space.observer"}
{dependency name="space.materials"}
{dependency name="space.meshparts"}
{dependency name="space.domevents"}
{dependency name="space.admin"}
{dependency name="space.pathedit"}

{foreach from=$types key=type item=typecount}
  {dependency name="space.`$type`"}
{/foreach}
{dependency name="space.fly"}
{dependency name="space.hud"}

<div class="elation_space_viewport" elation:component="space.fly">
 <elation:args>{ldelim}"sector":{jsonencode var=$sector}{rdelim}</elation:args>
</div>
{set var="page.title"}WebGL World Viewer{if !empty($root)} - {$root}{/if}{/set}
