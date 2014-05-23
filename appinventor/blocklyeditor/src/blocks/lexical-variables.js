// -*- mode: java; c-basic-offset: 2; -*-
// Copyright 2013-2014 MIT, All rights reserved
// Released under the MIT License https://raw.github.com/mit-cml/app-inventor/master/mitlicense.txt
/**
 * @license
 * @fileoverview Variables blocks for Blockly, modified for MIT App Inventor.
 * @author fturbak@wellesley.edu (Lyn Turbak)
 */

/**
 * Lyn's History:
 * [lyn, 03/04/13]
 *   + Remove notion of collapsed input from local variable declaration statements/expressions,
 *     which has been eliminated in updated to Blockly v1636.
 *   + Update appendTitle* to appendField*
 * [lyn, 01/18/13] Remove onchange from lexical_variable_get and lexical_variable_set.
 *    This fixes issue 667 (Variable getter/setter names deleted in copied blocks)
 *    and improves laggy drag problem.
 * [lyn, 10/27/13]
 *   + Modified local declaration parameter flydowns so editing the name changes corresponding name in an open mutator.
 *   + Changed local declaration compose() to rebuild inputs only if local names have changed.
 *     (essential for getting param flydown name changes reflected in open mutator).
 *   + Fixed local declaration expression compose() to be the same as that for local declaration statements.
 *   + Modified addDeclarationInputs_ to remove existing declarations, add new ones, and keep
 *     last two declarations (body and collapsed text) rather than recreating them.
 *     This is now used by both domToMutation() and compose(), eliminating duplicated code.
 *   + Eliminated dummy declarations.
 *   + Specify direction of flydowns
 * [lyn, 10/25/13] Made collapsed block labels more sensible.
 * [lyn, 10/10-14/13]
 *   + Installed variable declaration flydowns in global definition and local variable declaration
 *     statements and expressions.
 *   + Abstracted over string labels on all blocks using constants defined in en/_messages.js
 *   + Cleaned up code, including refactoring to increase sharing between
 *     local_declaration_statement and local_declaration_expression.
 *   + Fixed bug: Modified onchange for local declarations to keep localNames_ instance
 *     variable updated when param is edited directly on declaration block.
 *   + In local variable statements/expression, changed both "in do" and "in return"
 *     to "scope" (shape distinguishes them). But maybe these should just be empty string?
 * [lyn, 11/18/12] Renaming for globals (still working on renaming of procedure and loop params)
 * [lyn, 11/17/12] Integration of simple naming into App Inventor
 * [lyn, 11/11/12] More work on onchange event. Allow invalid names for untethered getters/setters
 *                 on workspace, but not when click in to other blocks.
 * [lyn, 11/08-10/12] Get dropdown list of names in scope to work for globals and params
 *                    (including loops) in raw blockly. Pass along to Andrew for integration
 *                    into AI. Initial work on onchange event to change names when getters/setters
 *                    copied and moved.
 * [lyn, 11/05-07/12] Add local variable declaration expressions. Get mutator working for local
 *                    declaration statements and expressions. But these don't save/load properly from XML
 *                    Helpful 10/7 hangout with Andrew and Paul.
 * [lyn, 11/04/12] Created. Add global declarations. Work on local variable declaration statement.
 */

/*
// For debugging only
function myStringify (obj) {
  var seen = [];
  return JSON.stringify(obj, function(key, val) {
   if (typeof val == "object") {
       if (seen.indexOf(val) >= 0) {
           return undefined;
       }
       seen.push(val);
   }
   return val
   });
}
*/

'use strict';

goog.provide('Blockly.Blocks.lexicalvariables');
goog.require('Blockly.Blocks.Utilities');
goog.require('goog.dom');

/**
 * Prototype bindings for a global variable declaration block
 */
Blockly.Blocks['global_declaration'] = {
  // Global var defn
  category: Blockly.MSG_VARIABLE_CATEGORY,
  helpUrl: Blockly.Msg.LANG_VARIABLES_GLOBAL_DECLARATION_HELPURL,
  init: function() {
    this.setColour(Blockly.VARIABLE_CATEGORY_HUE);
    this.appendValueInput('VALUE')
        .appendField(Blockly.Msg.LANG_VARIABLES_GLOBAL_DECLARATION_TITLE_INIT)
        .appendField(new Blockly.FieldGlobalFlydown(Blockly.Msg.LANG_VARIABLES_GLOBAL_DECLARATION_NAME,
                                                    Blockly.FieldFlydown.DISPLAY_BELOW), 'NAME')
        .appendField(Blockly.Msg.LANG_VARIABLES_GLOBAL_DECLARATION_TO);
    this.setTooltip(Blockly.Msg.LANG_VARIABLES_GLOBAL_DECLARATION_TOOLTIP);
  },
  getVars: function() {
    return [this.getFieldValue('NAME')];
  },
  renameVar: function(oldName, newName) {
    if (Blockly.Names.equals(oldName, this.getFieldValue('VAR'))) {
      this.setFieldValue(newName, 'NAME');
    }
  },
  typeblock: [{ translatedName: Blockly.Msg.LANG_VARIABLES_GLOBAL_DECLARATION_TITLE_INIT }]
};

/**
 * Prototype bindings for a variable getter block
 */
Blockly.Blocks['lexical_variable_get'] = {
  // Variable getter.
  category: Blockly.MSG_VARIABLE_CATEGORY,
  helpUrl: Blockly.Msg.LANG_VARIABLES_GET_HELPURL,
  init: function() {
    this.setColour(Blockly.VARIABLE_CATEGORY_HUE);
    this.fieldVar_ = new Blockly.FieldLexicalVariable(" ");
    this.fieldVar_.setBlock(this);
    this.appendDummyInput()
        .appendField(Blockly.Msg.LANG_VARIABLES_GET_TITLE_GET)
        .appendField(this.fieldVar_, 'VAR');
    this.setOutput(true, null);
    this.setTooltip(Blockly.Msg.LANG_VARIABLES_GET_TOOLTIP);
    this.errors = [{name:"checkIsInDefinition"},{name:"checkDropDownContainsValidValue",dropDowns:["VAR"]}];
  },
  getVars: function() {
    return [this.getFieldValue('VAR')];
  },
  renameLexicalVar: function(oldName, newName) {
    // console.log("Renaming lexical variable from " + oldName + " to " + newName);
    if (oldName === this.getFieldValue('VAR')) {
        this.setFieldValue(newName, 'VAR');
    }
  },
  typeblock: [{ translatedName: Blockly.Msg.LANG_VARIABLES_GET_TITLE_GET + ' variable' }]
};

/**
 * Prototype bindings for a variable setter block
 */
Blockly.Blocks['lexical_variable_set'] = {
  // Variable setter.
  category: Blockly.MSG_VARIABLE_CATEGORY,
  helpUrl: Blockly.Msg.LANG_VARIABLES_SET_HELPURL, // *** [lyn, 11/10/12] Fix this
  init: function() {
    this.setColour(Blockly.VARIABLE_CATEGORY_HUE);
    this.fieldVar_ = new Blockly.FieldLexicalVariable(" ");
    this.fieldVar_.setBlock(this);
    this.appendValueInput('VALUE')
        .appendField(Blockly.Msg.LANG_VARIABLES_SET_TITLE_SET)
        .appendField(this.fieldVar_, 'VAR')
        .appendField(Blockly.Msg.LANG_VARIABLES_SET_TITLE_TO);
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip(Blockly.Msg.LANG_VARIABLES_SET_TOOLTIP);
    this.errors = [{name:"checkIsInDefinition"},{name:"checkDropDownContainsValidValue",dropDowns:["VAR"]}];
  },
  getVars: function() {
    return [this.getFieldValue('VAR')];
  },
  renameLexicalVar: Blockly.Blocks.lexical_variable_get.renameLexicalVar,
  typeblock: [{ translatedName: Blockly.Msg.LANG_VARIABLES_SET_TITLE_SET + ' variable' }]
};

/**
 * Prototype bindings for a statement block that declares local names for use in a statement body.
 * [lyn, 10/13/13] Refactored to share more code with Blockly.Blocks.local_declaration_expression
 */
Blockly.Blocks['local_declaration_statement'] = {
  // Define a procedure with no return value.
  // category: null,  // Procedures are handled specially.
  category: Blockly.MSG_VARIABLE_CATEGORY,
  helpUrl: Blockly.Msg.LANG_VARIABLES_LOCAL_DECLARATION_HELPURL,
  bodyInputName: 'STACK',
  init: function() {
    this.initLocals();
    this.appendStatementInput('STACK')
        .appendField(Blockly.Msg.LANG_VARIABLES_LOCAL_DECLARATION_IN_DO);

    // Add notch and nub for vertical statement composition
    this.setPreviousStatement(true);
    this.setNextStatement(true);

    this.setTooltip(Blockly.Msg.LANG_VARIABLES_LOCAL_DECLARATION_TOOLTIP);
  },
  initLocals: function() {
    this.setColour(Blockly.VARIABLE_CATEGORY_HUE);
    this.localNames_ = [Blockly.Msg.LANG_VARIABLES_LOCAL_DECLARATION_DEFAULT_NAME];
    var declInput = this.appendValueInput('DECL0');
    declInput.appendField(Blockly.Msg.LANG_VARIABLES_LOCAL_DECLARATION_TITLE_INIT)
             .appendField(this.parameterFlydown(0), 'VAR0')
             .appendField(Blockly.Msg.LANG_VARIABLES_LOCAL_DECLARATION_INPUT_TO)
             .setAlign(Blockly.ALIGN_RIGHT);

    // Add mutator for editing local variable names
    this.setMutator(new Blockly.Mutator(['local_mutatorarg']));
  },
  onchange: function () {
     this.localNames_ = this.declaredNames(); // ensure localNames_ is in sync with paramFlydown fields
   },
  mutationToDom: function() { // Store local names in mutation element of XML for block
    var container = document.createElement('mutation');
    for (var i = 0; i< this.localNames_.length; i++) {
      var parameter = document.createElement('localname');
      parameter.setAttribute('name', this.localNames_[i]);
      container.appendChild(parameter);
    }
    return container;
  },
  domToMutation: function(xmlElement) { // Retrieve local names from mutation element of XML for block
                                        // and replace existing declarations
    var children = goog.dom.getChildren(xmlElement);
    if (children.length > 0) { // Ensure xml element is nonempty
      // Else we'll overwrite initial list with "name" for new block
      this.localNames_ = [];
      for (var i = 0, childNode; childNode = children[i]; i++) {
        if (childNode.nodeName.toLowerCase() == 'localname') {
          this.localNames_.push(childNode.getAttribute('name'));
        }
      }
    }
    this.addDeclarationInputs_(this.localNames_); // add declarations; inits are undefined
  },
  addDeclarationInputs_: function(names, inits) {
    // Modify this block to replace existing initializers by new declaration inputs created from names and inits.
    // If inits is undefined, treat all initial expressions as undefined.
    // Keep existing body at end of input list.
    // [lyn, 03/04/13] As of change to, Blockly 1636, there is no longer a collapsed input at end.

    // Remember last (= body) input
    var bodyInput = this.inputList[this.inputList.length - 1]; // Body input for local declaration
    var numDecls = this.inputList.length - 1;

    // Modify this local-in-do block according to arrangement of name blocks in mutator editor.
    // Remove all the local declaration inputs ...
    for (var i = 0; i < numDecls; i++) {
      this.removeInput('DECL' + i);
    }

    // Empty the inputList and recreate it, building local initializers from mutator
    this.inputList = [];
    this.localNames_ = names;

    for (var i = 0; i < names.length; i++) {
      var declInput = this.appendValueInput('DECL' + i);
      // [lyn, 11/06/12]
      //   This was for case where tried to put "local" keyword on same line with first local name.
      //   But even though alignment set to Blockly.ALIGN_RIGHT, the input was left justified
      //   and covered the plus sign for popping up the mutator. So I put the "local" keyword
      //   on it's own line even though this wastes vertical space. This should be fixed in the future.
      // if (i == 0) {
      //  declInput.appendField("local"); // Only put keyword "local" on top line.
      // }
      declInput.appendField(Blockly.Msg.LANG_VARIABLES_LOCAL_DECLARATION_TITLE_INIT)
               .appendField(this.parameterFlydown(i), 'VAR' + i)
               .appendField(Blockly.Msg.LANG_VARIABLES_LOCAL_DECLARATION_INPUT_TO)
               .setAlign(Blockly.ALIGN_RIGHT);
      if (inits && inits[i]) { // If there is an initializer, connect it
        declInput.connection.connect(inits[i]);
      }
    }

    // Now put back last (= body) input
    this.inputList = this.inputList.concat(bodyInput);
  },
  // [lyn, 10/27/13] Introduced this to correctly handle renaming of mutatorarg in open mutator
  // when procedure parameter flydown name is edited.
  parameterFlydown: function (paramIndex) { // Return a new local variable parameter flydown
    var initialParamName = this.localNames_[paramIndex];
    var localDecl = this; // Here, "this" is the local decl block. Name it to use in function below
    var localWorkspace = this.workspace;
    var localParameterChangeHandler = function (newParamName) {
      // This handler has the same subtleties as procedureParameterChangeHandler in language/common/procedures.js,
      // but is somewhat simpler since doesn't have associated callers to change. See the notes there.

      // See Subtleties #1 and #2 in  procedureParameterChangeHandler in language/common/procedures.js
      var newLocals = localDecl.localNames_;
      newLocals[paramIndex] = newParamName;

      // If there's an open mutator, change the name in the corresponding slot.
      if (localDecl.mutator && localDecl.mutator.rootBlock_) {
        // Iterate through mutatorarg param blocks and change name of one at paramIndex
        var mutatorContainer = localDecl.mutator.rootBlock_;
        var mutatorargIndex = 0;
        var mutatorarg = mutatorContainer.getInputTargetBlock('STACK');
        while (mutatorarg && mutatorargIndex < paramIndex) {
          mutatorarg = mutatorarg.nextConnection && mutatorarg.nextConnection.targetBlock();
          mutatorargIndex++;
        }
        if (mutatorarg && mutatorargIndex == paramIndex) {
          // See Subtlety #3 in  procedureParameterChangeHandler in language/common/procedures.js
          Blockly.Field.prototype.setText.call(mutatorarg.getField_("NAME"), newParamName);
        }
      }
    }
    return new Blockly.FieldParameterFlydown(initialParamName,
        true, // name is editable
        Blockly.FieldFlydown.DISPLAY_RIGHT,
        localParameterChangeHandler);
  },
  decompose: function(workspace) {
    // Create "mutator" editor populated with name blocks with local variable names
    var containerBlock = new Blockly.Block.obtain(workspace, 'local_mutatorcontainer');
    containerBlock.initSvg();
    containerBlock.setDefBlock(this);
    var connection = containerBlock.getInput('STACK').connection;
    for (var i = 0; i < this.localNames_.length; i++) {
      var localName = this.getFieldValue('VAR' + i);
      var nameBlock = new Blockly.Block.obtain(workspace, 'local_mutatorarg');
      nameBlock.initSvg();
      nameBlock.setFieldValue(localName, 'NAME');
      // Store the old location.
      nameBlock.oldLocation = i;
      connection.connect(nameBlock.previousConnection);
      connection = nameBlock.nextConnection;
    }
    return containerBlock;
  },
  compose: function(containerBlock) {
    // [lyn, 10/27/13] Modified this so that doesn't rebuild block if names haven't changed.
    // This is *essential* to handle Subtlety #3 in localParameterChangeHandler within parameterFlydown.

    var newLocalNames = [];
    var initializers = [];
    var mutatorarg = containerBlock.getInputTargetBlock('STACK');
    while (mutatorarg) {
      newLocalNames.push(mutatorarg.getFieldValue('NAME'));
      initializers.push(mutatorarg.valueConnection_); // pushes undefined if doesn't exist
      mutatorarg = mutatorarg.nextConnection && mutatorarg.nextConnection.targetBlock();
    }

    // Reconstruct inputs only if local list has changed
    if (this.localNames_.join(',') !== newLocalNames.join(',')) {

      // Switch off rendering while the block is rebuilt.
      // var savedRendered = this.rendered;
      // this.rendered = false;

      this.addDeclarationInputs_(newLocalNames, initializers);

      // Restore rendering and show the changes.
      // this.rendered = savedRendered;
      // if (this.rendered) {
      //  this.render();
      // }
    }
  },
  dispose: function() {
    // *** [lyn, 11/07/12] Dunno if anything needs to be done here.
    // Call parent's destructor.
    Blockly.Block.prototype.dispose.apply(this, arguments);
    // [lyn, 11/07/12] In above line, don't know where "arguments" param comes from,
    // but if it's remove, there's no clicking sound upon deleting the block!
  },
  saveConnections: function(containerBlock) {
    // Store child initializer blocks for local name declarations with name blocks in mutator editor
    var nameBlock = containerBlock.getInputTargetBlock('STACK');
    var i = 0;
    while (nameBlock) {
      var localDecl = this.getInput('DECL' + i);
      nameBlock.valueConnection_ =
        localDecl && localDecl.connection.targetConnection;
      i++;
      nameBlock = nameBlock.nextConnection &&
      nameBlock.nextConnection.targetBlock();
    }
    // Store body statement or expression connection
    var bodyInput = this.getInput(this.bodyInputName); // 'STACK' or 'RETURN'
    if (bodyInput) {
      containerBlock.bodyConnection_ = bodyInput.connection.targetConnection;
    }
  },
  getVars: function() {
    var varList = [];
    for (var i = 0, input; input = this.getFieldValue('VAR' + i); i++) {
      varList.push(input);
    }
    return varList;
  },
  declaredNames: function () { // Interface with Blockly.LexicalVariable.renameParam
    return this.getVars();
  },
  blocksInScope: function () { // Interface with Blockly.LexicalVariable.renameParam
    var doBody = this.getInputTargetBlock(this.bodyInputName); // *** [lyn, 11/24/12] This will go away with DO-AND-RETURN block
    var doBodyList = (doBody && [doBody]) || []; // List of non-null doBody or empty list for null doBody
    return doBodyList; // List of non-null body elements.
  },
  renameVar: function(oldName, newName) {
    // *** [lyn, 11/07/12] Still need to handle renaming of local variable names
        /*
    var change = false;
    for (var x = 0; x < this.arguments_.length; x++) {
      if (Blockly.Names.equals(oldName, this.arguments_[x])) {
        this.arguments_[x] = newName;
        change = true;
      }
    }
    if (change) {
      this.updateParams_();
      // Update the mutator's variables if the mutator is open.
      if (this.mutator.isVisible_()) {
        var blocks = this.mutator.workspace_.getAllBlocks();
        for (var x = 0, block; block = blocks[x]; x++) {
          if (block.type == 'local_mutatorarg' &&
              Blockly.Names.equals(oldName, block.getFieldValue('NAME'))) {
            block.setFieldValue(newName, 'NAME');
          }
        }
      }
    }
        */
  },
  //TODO (user) this has not been internationalized yet
  typeblock: [{ translatedName: 'initialize local in do' }]
};


/**
 * Prototype bindings for an expression block that declares local names for use in an expression body.
 * [lyn, 10/13/13] Refactored to share more code with Blockly.Blocks.local_declaration_statement
 */
Blockly.Blocks['local_declaration_expression'] = {
  category: Blockly.MSG_VARIABLE_CATEGORY,  // *** [lyn, 11/07/12] Abstract over this
  helpUrl: Blockly.Msg.LANG_VARIABLES_LOCAL_DECLARATION_EXPRESSION_HELPURL,
  initLocals: Blockly.Blocks.local_declaration_statement.initLocals,
  bodyInputName: 'RETURN',
  init: function() {
    this.initLocals();
    this.appendIndentedValueInput('RETURN')
        .appendField(Blockly.Msg.LANG_VARIABLES_LOCAL_DECLARATION_EXPRESSION_IN_RETURN);
    // Create plug for expression output
    this.setOutput(true, null);
    this.setTooltip(Blockly.Msg.LANG_VARIABLES_LOCAL_DECLARATION_EXPRESSION_TOOLTIP);
  },
  mutationToDom: Blockly.Blocks.local_declaration_statement.mutationToDom,
  domToMutation: Blockly.Blocks.local_declaration_statement.domToMutation,
  addDeclarationInputs_: Blockly.Blocks.local_declaration_statement.addDeclarationInputs_,
  parameterFlydown: Blockly.Blocks.local_declaration_statement.parameterFlydown,
  blocksInScope: Blockly.Blocks.local_declaration_statement.blocksInScope,
  decompose: Blockly.Blocks.local_declaration_statement.decompose,
  compose: Blockly.Blocks.local_declaration_statement.compose,
  dispose: Blockly.Blocks.local_declaration_statement.dispose,
  saveConnections: Blockly.Blocks.local_declaration_statement.saveConnections,
  getVars: Blockly.Blocks.local_declaration_statement.getVars,
  declaredNames: Blockly.Blocks.local_declaration_statement.declaredNames,
  renameVar: Blockly.Blocks.local_declaration_statement.renameVar,
  //TODO (user) this has not been internationalized yet
  typeblock: [{ translatedName: 'initialize local in return' }]
};

Blockly.Blocks['local_mutatorcontainer'] = {
  // Local variable container (for mutator dialog).
  init: function() {
    this.setColour(Blockly.VARIABLE_CATEGORY_HUE);
    this.appendDummyInput()
        .appendField(Blockly.Msg.LANG_VARIABLES_LOCAL_MUTATOR_CONTAINER_TITLE_LOCAL_NAMES);
    this.appendStatementInput('STACK');
    this.setTooltip('');
    this.contextMenu = false;
  },
  // [lyn. 11/24/12] Set procBlock associated with this container.
  setDefBlock: function (defBlock) {
    this.defBlock_ = defBlock;
  },
  // [lyn. 11/24/12] Set procBlock associated with this container.
  // Invariant: should not be null, since only created as mutator for a particular proc block.
  getDefBlock: function () {
    return this.defBlock_;
  },
  // [lyn. 11/24/12] Return list of param names in this container
  // Invariant: there should be no duplicates!
  declaredNames: function () {
    var paramNames = [];
    var paramBlock = this.getInputTargetBlock('STACK');
    while (paramBlock) {
      paramNames.push(paramBlock.getFieldValue('NAME'));
      paramBlock = paramBlock.nextConnection &&
                   paramBlock.nextConnection.targetBlock();
    }
    return paramNames;
  }
};

Blockly.Blocks['local_mutatorarg'] = {
  // Procedure argument (for mutator dialog).
  init: function() {
    this.setColour(Blockly.VARIABLE_CATEGORY_HUE);
    this.appendDummyInput()
        .appendField(Blockly.Msg.LANG_VARIABLES_LOCAL_MUTATOR_ARG_TITLE_NAME)
        .appendField(new Blockly.FieldTextInput(Blockly.Msg.LANG_VARIABLES_LOCAL_MUTATOR_ARG_DEFAULT_VARIABLE,
                                                Blockly.LexicalVariable.renameParam),
                     'NAME');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('');
    this.contextMenu = false;
  },
  getContainerBlock: function () {
    var parent = this.getParent();
    while (parent && ! (parent.type === "local_mutatorcontainer")) {
      parent = parent.getParent();
    }
    // [lyn, 11/24/12] Cache most recent container block so can reference it upon removal from mutator arg stack
    this.cachedContainerBlock_ = (parent && (parent.type === "local_mutatorcontainer") && parent) || null;
    return this.cachedContainerBlock_;
  },
  getDefBlock: function () {
    var container = this.getContainerBlock();
    return (container && container.getDefBlock()) || null;
  },
  blocksInScope: function () {
    var defBlock = this.getDefBlock();
    return (defBlock && defBlock.blocksInScope()) || [];
  },
  declaredNames: function () {
    var container = this.getContainerBlock();
    return (container && container.declaredNames()) || [];
  },

  // [lyn, 11/24/12] Check for situation in which mutator arg has been removed from stack,
  onchange: function() {
    var paramName = this.getFieldValue('NAME');
    if (paramName) { // paramName is null when delete from stack
      // console.log("Mutatorarg onchange: " + paramName);
      var cachedContainer = this.cachedContainerBlock_;
      var container = this.getContainerBlock(); // Order is important; this must come after cachedContainer
                                                // since it sets cachedContainerBlock_
      // console.log("Mutatorarg onchange: " + paramName
      //            + "; cachedContainer = " + JSON.stringify((cachedContainer && cachedContainer.type) || null)
      //            + "; container = " + JSON.stringify((container && container.type) || null));
      if ((! cachedContainer) && container) {
        // Event: added mutator arg to container stack
        // console.log("Mutatorarg onchange ADDED: " + paramName);
        var declaredNames = this.declaredNames();
        var firstIndex = declaredNames.indexOf(paramName);
        if (firstIndex != -1) {
          // Assertion: we should get here, since paramName should be among names
          var secondIndex = declaredNames.indexOf(paramName, firstIndex+1);
          if (secondIndex != -1) {
            // If we get here, there is a duplicate on insertion that must be resolved
            var newName = Blockly.FieldLexicalVariable.nameNotIn(paramName,declaredNames);
            this.setFieldValue(newName, 'NAME');
          }
        }
      }
    }
  }
};


