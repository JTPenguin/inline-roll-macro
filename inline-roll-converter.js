/**
 * PF2e Inline Roll Converter
 * 
 * Converts plain text descriptions into Foundry VTT inline automation syntax
 * for the Pathfinder 2e Remaster system.
 */

// Remaster damage types for validation
const DAMAGE_TYPES = [
    'acid', 'bludgeoning', 'cold', 'electricity', 'fire', 'force', 'mental', 
    'piercing', 'slashing', 'sonic', 'spirit', 'vitality', 'void', 'bleed', 'poison',
    'chaotic', 'evil', 'good', 'lawful', 'positive', 'negative'
];

// Skills list for skill check patterns
const SKILLS = [
    'Acrobatics', 'Arcana', 'Athletics', 'Crafting', 'Deception', 'Diplomacy', 
    'Intimidation', 'Medicine', 'Nature', 'Occultism', 'Performance', 'Religion', 
    'Society', 'Stealth', 'Survival', 'Thievery'
];

// Create regex patterns from type arrays
const DAMAGE_TYPE_PATTERN = DAMAGE_TYPES.join('|');
const SKILL_PATTERN = SKILLS.join('|');

// Configuration object for conversion patterns (ordered by priority)
const CONVERSION_PATTERNS = {
    // ============================================================================
    // PRIORITY 1 - HIGHEST PRIORITY PATTERNS (Process first to avoid conflicts)
    // ============================================================================
    
    // Comprehensive save pattern (all variations including parenthetical)
    comprehensiveSave: {
        regex: /(?:\(?)((?:basic\s+)?(?:DC\s*(\d{1,2})\s*[,;:\(\)]?\s*)?(fort(?:itude)?|ref(?:lex)?|will)(?:\s+save)?(?:\s*[,;:\(\)]?\s*(?:basic\s+)?DC\s*(\d{1,2}))|(?:basic\s+)?(fort(?:itude)?|ref(?:lex)?|will)(?:\s+save)?\s+basic(?:\s*[,;:\(\)]?\s*DC\s*(\d{1,2}))|(?:basic\s+)?DC\s*(\d{1,2})\s+(fort(?:itude)?|ref(?:lex)?|will)(?:\s+save)?|DC\s*(\d{1,2})\s+(?:basic\s+)?(fort(?:itude)?|ref(?:lex)?|will)(?:\s+save)?)(?:\)?)/gi,
        replacement: (match, savePhrase, dc1, save1, dc2, save2, dc3, dc4, save3, dc5, save4) => {
            // Extract save type and normalize
            const save = (save1 || save2 || save3 || save4).toLowerCase();
            const normalizedSave = save.startsWith('fort') ? 'fortitude' : 
                                  save.startsWith('ref') ? 'reflex' : 'will';
            
            // Extract DC (could be in any of the capture groups)
            const dc = dc1 || dc2 || dc3 || dc4 || dc5;
            
            // Check if basic is present
            const basicMatch = savePhrase.match(/\bbasic\b/i);
            const isBasic = !!basicMatch;
            
            // Check if the original match was wrapped in parentheses
            const wasParenthetical = match.startsWith('(') && match.endsWith(')');
            
            // Build the replacement
            const basicStr = isBasic ? '|basic' : '';
            const replacement = `@Check[${normalizedSave}|dc:${dc}${basicStr}] save`;
            
            // Wrap in parentheses if the original was parenthetical
            return wasParenthetical ? `(${replacement})` : replacement;
        },
        priority: 1,
        description: 'Comprehensive save pattern (all variations including parenthetical)'
    },
    
    // ============================================================================
    // PRIORITY 2 - DAMAGE PATTERNS (Process before consolidation)
    // ============================================================================
    
    // Persistent damage (highest priority among standard damage)
    persistentDamage: {
        regex: new RegExp(`(\\d+(?:d\\d+)?(?:[+-]\\d+)?)\\s+(?:persistent\\s+(${DAMAGE_TYPE_PATTERN})|(${DAMAGE_TYPE_PATTERN})\\s+persistent)`, 'gi'),
        replacement: (match, dice, type1, type2) => {
            const damageType = type1 || type2;
            return `@Damage[${dice}[persistent,${damageType}]]`;
        },
        priority: 2,
        description: 'Persistent damage'
    },
    
    // Splash damage (handles both "fire splash" and "splash fire")
    splashDamage: {
        regex: new RegExp(`(\\d+(?:d\\d+)?(?:[+-]\\d+)?)\\s+(?:(${DAMAGE_TYPE_PATTERN})\\s+splash|splash\\s+(${DAMAGE_TYPE_PATTERN}))`, 'gi'),
        replacement: (match, dice, type1, type2) => {
            const damageType = type1 || type2;
            return `@Damage[((${dice})[splash])[${damageType}]] splash`;
        },
        priority: 2,
        description: 'Splash damage'
    },
    
    // Precision damage with type (handles both "precision fire" and "fire precision")
    precisionDamage: {
        regex: new RegExp(`(\\d+(?:d\\d+)?(?:[+-]\\d+)?)\\s+(?:precision\\s+(${DAMAGE_TYPE_PATTERN})|(${DAMAGE_TYPE_PATTERN})\\s+precision)`, 'gi'),
        replacement: (match, dice, type1, type2) => {
            const damageType = type1 || type2;
            return `@Damage[((${dice})[precision])[${damageType}]] precision`;
        },
        priority: 2,
        description: 'Precision damage with type'
    },
    
    // Generic precision damage (no type specified)
    genericPrecisionDamage: {
        regex: /(\d+(?:d\d+)?(?:[+-]\d+)?)\s+precision/gi,
        replacement: '@Damage[($1)[precision]] precision',
        priority: 2,
        description: 'Generic precision damage'
    },
    
    // Healing patterns
    healingHitPoints: {
        regex: /(\d+(?:d\d+)?(?:[+-]\d+)?)\s+(?:hit\s+points?|HP)/gi,
        replacement: '@Damage[$1[healing]] hit points',
        priority: 2,
        description: 'Healing hit points'
    },
    
    healingGeneric: {
        regex: /(\d+(?:d\d+)?(?:[+-]\d+)?)\s+healing/gi,
        replacement: '@Damage[$1[healing]] healing',
        priority: 2,
        description: 'Generic healing'
    },
    
    // Multiple skill checks (must come before single skill checks)
    multipleSkillChecks: {
        regex: new RegExp(`DC\\s+(\\d+)\\s+((?:${SKILL_PATTERN})(?:\\s*,\\s*(?:${SKILL_PATTERN}))*\\s*(?:,\\s*)?(?:or\\s+)?(?:${SKILL_PATTERN}))\\s+check`, 'gi'),
        replacement: (match, dc, skillsText) => {
            // Clean up the skills text and split into individual skills
            const skills = skillsText
                .replace(/\s+or\s+/gi, ',')  // Replace "or" with comma
                .split(/\s*,\s*/)            // Split on commas
                .map(skill => skill.trim())  // Trim whitespace
                .filter(skill => skill.length > 0); // Remove empty strings
            
            // Create individual check buttons while preserving structure
            const checkButtons = skills.map(skill => `@Check[${skill.toLowerCase()}|dc:${dc}]`);
            
            if (skills.length === 2) {
                // Two skills: "DC X Skill1 or Skill2 check"
                return `DC ${dc} ${checkButtons[0]} or ${checkButtons[1]} check`;
            } else if (skills.length > 2) {
                // Multiple skills: "DC X Skill1, Skill2, or Skill3 check"
                const lastSkill = checkButtons.pop();
                return `DC ${dc} ${checkButtons.join(', ')}, or ${lastSkill} check`;
            } else {
                // Fallback to single skill
                return `DC ${dc} ${checkButtons[0]} check`;
            }
        },
        priority: 2,
        description: 'Multiple skill checks'
    },
    
    // Perception checks
    perceptionChecks: {
        regex: /DC\s+(\d+)\s+Perception\s+check/gi,
        replacement: '@Check[perception|dc:$1] check',
        priority: 2,
        description: 'Perception checks'
    },
    
    // Flat checks
    flatChecks: {
        regex: /DC\s+(\d+)\s+flat\s+check/gi,
        replacement: '@Check[flat|dc:$1]',
        priority: 2,
        description: 'Flat checks'
    },
    
    // Ability recharge patterns (higher priority than basic duration rolls)
    abilityRechargeSpecific: {
        regex: /again for (\d+(?:d\d+)?(?:[+-]\d+)?)\s+(rounds?|minutes?|hours?|days?)/gi,
        replacement: 'again for [[/gmr $1 #Recharge]]{$1 $2}',
        priority: 2,
        description: 'Ability recharge pattern'
    },
    
    genericRechargeSpecific: {
        regex: /can't use this (?:ability|action|feature|spell) again for (\d+(?:d\d+)?(?:[+-]\d+)?)\s+(rounds?|minutes?|hours?|days?)/gi,
        replacement: "can't use this ability again for [[/gmr $1 #Recharge]]{$1 $2}",
        priority: 2,
        description: 'Generic ability recharge'
    },
    
    // Recharge variants
    rechargePattern1: {
        regex: /recharges? (?:in|after) (\d+(?:d\d+)?(?:[+-]\d+)?)\s+(rounds?|minutes?|hours?|days?)/gi,
        replacement: 'recharges in [[/gmr $1 #Recharge]]{$1 $2}',
        priority: 2,
        description: 'Recharge timing pattern'
    },
    
    // ============================================================================
    // PRIORITY 3 - BASIC DAMAGE AND SKILL PATTERNS
    // ============================================================================
    
    // Basic damage with type
    basicDamage: {
        regex: new RegExp(`(\\d+(?:d\\d+)?(?:[+-]\\d+)?)\\s+(${DAMAGE_TYPE_PATTERN})`, 'gi'),
        replacement: '@Damage[($1)[$2]]',
        priority: 3,
        description: 'Basic damage rolls'
    },
    
    // Single skill checks (lower priority than multiple)
    skillChecks: {
        regex: new RegExp(`DC\\s+(\\d+)\\s+(${SKILL_PATTERN})\\s+check`, 'gi'),
        replacement: (match, dc, skill) => `@Check[${skill.toLowerCase()}|dc:${dc}] check`,
        priority: 3,
        description: 'Single skill checks'
    },
    
    // ============================================================================
    // PRIORITY 4 - DAMAGE CONSOLIDATION AND LEGACY CONVERSIONS
    // ============================================================================
    
    // Multiple damage types - consolidate individual @Damage rolls into single roll
    multipleDamageTypes: {
        regex: /@Damage\[[^\@]*\](?:\s+(?:(?:splash|precision)\s+)?damage|(?:\s+(?:splash|precision)))?(?:\s*,\s*(?:and\s+)?|\s+and\s+)@Damage\[[^\@]*\](?:\s+(?:splash|precision))?(?:(?:\s*,\s*(?:and\s+)?|\s+and\s+)@Damage\[[^\@]*\](?:\s+(?:(?:splash|precision)\s+)?damage|(?:\s+(?:splash|precision)))?)*(?:\s+(?:splash|precision))?/gi,
        replacement: (match) => {
            // Extract all @Damage[...] patterns from the match, handling nested brackets
            const damageRolls = [];
            const regex = /@Damage\[/g;
            let startMatch;
            
            while ((startMatch = regex.exec(match)) !== null) {
                const startPos = startMatch.index + startMatch[0].length;
                let bracketCount = 1;
                let endPos = startPos;
                
                // Find the matching closing bracket by counting brackets
                while (endPos < match.length && bracketCount > 0) {
                    if (match[endPos] === '[') {
                        bracketCount++;
                    } else if (match[endPos] === ']') {
                        bracketCount--;
                    }
                    if (bracketCount > 0) {
                        endPos++;
                    }
                }
                
                if (bracketCount === 0) {
                    const damageContent = match.substring(startPos, endPos);
                    damageRolls.push(damageContent);
                }
            }
            
            if (damageRolls.length >= 2) {
                return `@Damage[${damageRolls.join(',')}]`;
            }
            
            return match;
        },
        priority: 4,
        description: 'Multiple damage types consolidation'
    },
    
    // Legacy damage type conversions (only within @Damage[...] rolls, after all damage roll conversions)
    legacyAlignmentDamage: {
        // Replace any occurrence of a legacy alignment type in the type list with 'spirit'
        regex: /@Damage\[(.*?\[)([^\]]*?)(chaotic|evil|good|lawful)([^\]]*?)\](.*?)\]/gi,
        replacement: (match, prefix, before, legacyType, after, suffix) => `@Damage[${prefix}${before}spirit${after}]${suffix}]`,
        priority: 4,
        description: 'Legacy alignment damage to spirit (within @Damage, anywhere in type list)'
    },
    
    legacyPositiveDamage: {
        regex: /@Damage\[(.*?\[)([^\]]*?)(positive)([^\]]*?)\](.*?)\]/gi,
        replacement: (match, prefix, before, legacyType, after, suffix) => `@Damage[${prefix}${before}vitality${after}]${suffix}]`,
        priority: 4,
        description: 'Legacy positive damage to vitality (within @Damage, anywhere in type list)'
    },
    
    legacyNegativeDamage: {
        regex: /@Damage\[(.*?\[)([^\]]*?)(negative)([^\]]*?)\](.*?)\]/gi,
        replacement: (match, prefix, before, legacyType, after, suffix) => `@Damage[${prefix}${before}void${after}]${suffix}]`,
        priority: 4,
        description: 'Legacy negative damage to void (within @Damage, anywhere in type list)'
    },
    
    // ============================================================================
    // PRIORITY 5 - AREA EFFECTS (Lowest priority)
    // ============================================================================
    
    // Basic area effects
    basicAreaEffects: {
        regex: /(\d+)-foot\s+(burst|cone|line|emanation)/gi,
        replacement: '@Template[type:$2|distance:$1]',
        priority: 5,
        description: 'Basic area effects'
    },
    
    // Radius effects
    radiusEffects: {
        regex: /(\d+)-foot\s+radius/gi,
        replacement: '@Template[type:burst|distance:$1]',
        priority: 5,
        description: 'Radius area effects'
    }
};

/**
 * Main conversion engine
 * @param {string} inputText - The text to convert
 * @returns {object} - Conversion result with converted text and stats
 */
function convertText(inputText) {
    if (!inputText || inputText.trim() === '') {
        return {
            convertedText: '',
            conversionsCount: 0,
            errors: [],
            patternMatches: {}
        };
    }

    let convertedText = inputText;
    let conversionsCount = 0;
    let errors = [];
    let patternMatches = {};

    try {
        // Sort patterns by priority (lowest number = highest priority)
        const sortedPatterns = Object.entries(CONVERSION_PATTERNS)
            .sort(([,a], [,b]) => a.priority - b.priority);

        // Process each conversion pattern in priority order
        for (const [patternName, pattern] of sortedPatterns) {
            console.log(`PF2e Converter: Checking pattern "${patternName}" (priority ${pattern.priority})`);
            
            const matches = convertedText.match(pattern.regex);
            if (matches) {
                const matchCount = matches.length;
                console.log(`PF2e Converter: Found ${matchCount} matches for "${patternName}":`, matches);
                console.log(`PF2e Converter: Text before replacement:`, convertedText);
                
                convertedText = convertedText.replace(pattern.regex, pattern.replacement);
                conversionsCount += matchCount;
                patternMatches[patternName] = matchCount;
                
                console.log(`PF2e Converter: Text after replacement:`, convertedText);
                console.log(`PF2e Converter: Applied ${pattern.description} - ${matchCount} conversions`);
            } else {
                console.log(`PF2e Converter: No matches for "${patternName}"`);
            }
        }

        return {
            convertedText,
            conversionsCount,
            errors,
            patternMatches
        };

    } catch (error) {
        console.error('PF2e Converter: Error during conversion:', error);
        errors.push(`Conversion error: ${error.message}`);
        
        return {
            convertedText: inputText, // Return original text on error
            conversionsCount: 0,
            errors,
            patternMatches: {}
        };
    }
}

/**
 * Validate damage types in text
 * @param {string} text - Text to validate
 * @returns {object} - Validation results
 */
function validateDamageTypes(text) {
    const foundTypes = [];
    
    // Find all damage type mentions
    const damageRegex = /(\w+)\s+damage/gi;
    let match;
    
    while ((match = damageRegex.exec(text)) !== null) {
        const damageType = match[1].toLowerCase();
        
        if (DAMAGE_TYPES.includes(damageType)) {
            foundTypes.push(damageType);
        }
    }
    
    return {
        validTypes: [...new Set(foundTypes)],
        hasLegacyTypes: false
    };
}

/**
 * Create a live preview with active inline rolls
 * @param {string} text - Text with inline roll syntax
 * @param {HTMLElement} container - Container to render preview in
 */
async function createLivePreview(text, container) {
    if (!text || text.trim() === '') {
        container.innerHTML = '<em style="color: #999;">Live preview will appear here...</em>';
        return;
    }

    try {
        // Use TextEditor to process the inline rolls
        const processedHTML = await TextEditor.enrichHTML(text, {
            async: true,
            rollData: {},
            relativeTo: null
        });

        // Create a styled container for the preview
        const previewContent = `
            <div class="pf2e-preview-content" style="
                background: white;
                border: 1px solid #ccc;
                border-radius: 4px;
                padding: 10px;
                font-family: 'Signika', sans-serif;
                font-size: 14px;
                line-height: 1.4;
                color: #191813;
                max-height: 200px;
                overflow-y: auto;
            ">
                ${processedHTML}
            </div>
        `;

        container.innerHTML = previewContent;

        // Add click handlers to the inline rolls
        const inlineRolls = container.querySelectorAll('.inline-roll');
        inlineRolls.forEach(roll => {
            roll.style.cursor = 'pointer';
            roll.addEventListener('click', async (event) => {
                event.preventDefault();
                event.stopPropagation();
                
                try {
                    // Execute the inline roll
                    const formula = roll.dataset.formula || roll.innerText;
                    const rollData = {};
                    
                    // Create and evaluate the roll
                    const actualRoll = new Roll(formula, rollData);
                    await actualRoll.evaluate();
                    
                    // Display the roll result
                    actualRoll.toMessage({
                        flavor: "PF2e Converter Preview Roll",
                        speaker: ChatMessage.getSpeaker()
                    });
                    
                } catch (rollError) {
                    console.error('Error executing preview roll:', rollError);
                    ui.notifications.warn(`Could not execute roll: ${rollError.message}`);
                }
            });
        });

    } catch (error) {
        console.error('Error creating live preview:', error);
        container.innerHTML = `<em style="color: #d32f2f;">Error creating preview: ${error.message}</em>`;
    }
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 */
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        ui.notifications.info("Text copied to clipboard!");
    } catch (error) {
        console.error('Failed to copy text:', error);
        ui.notifications.error("Failed to copy text to clipboard.");
    }
}

/**
 * Create and show the converter dialog
 */
function showConverterDialog() {
    const dialogContent = `
        <div class="pf2e-converter-dialog">
            <div class="form-group">
                <label for="input-text"><strong>Input Text:</strong></label>
                <textarea 
                    id="input-text" 
                    name="inputText" 
                    rows="6" 
                    placeholder="Paste your spell, ability, or feat description here..."
                    style="width: 100%; resize: vertical; font-family: monospace; font-size: 12px;"
                ></textarea>
            </div>
            
            <div class="form-group">
                <label for="output-text"><strong>Converted Text:</strong></label>
                <textarea 
                    id="output-text" 
                    name="outputText" 
                    rows="6" 
                    readonly
                    style="width: 100%; resize: vertical; font-family: monospace; font-size: 12px; background-color: #f0f0f0;"
                ></textarea>
            </div>
            
            <div class="form-group">
                <label for="live-preview"><strong>Live Preview:</strong> <small>(Click inline rolls to test them)</small></label>
                <div 
                    id="live-preview" 
                    style="
                        width: 100%; 
                        min-height: 100px; 
                        border: 1px solid #ddd; 
                        border-radius: 4px; 
                        background-color: #fafafa;
                        padding: 8px;
                        font-family: 'Signika', sans-serif;
                        font-size: 13px;
                        overflow-y: auto;
                        max-height: 200px;
                    "
                >
                    <em style="color: #999;">Live preview will appear here...</em>
                </div>
            </div>
            
            <div class="form-group">
                <div id="conversion-stats" style="font-size: 12px; color: #666; margin-top: 5px;">
                    Ready to convert...
                </div>
                <div id="pattern-details" style="font-size: 11px; color: #888; margin-top: 5px; display: none;">
                </div>
            </div>
            
            <div class="converter-controls" style="display: flex; gap: 10px; margin-top: 15px;">
                <button type="button" id="copy-output" style="flex: 1; padding: 8px;">Copy Output</button>
                <button type="button" id="clear-all" style="flex: 1; padding: 8px;">Clear All</button>
                <button type="button" id="show-details" style="flex: 1; padding: 8px;">Show Details</button>
            </div>
        </div>
        
        <style>
            .pf2e-converter-dialog {
                min-width: 700px;
            }
            .pf2e-converter-dialog .form-group {
                margin-bottom: 15px;
            }
            .pf2e-converter-dialog label {
                display: block;
                margin-bottom: 5px;
            }
            #pattern-details {
                background-color: #f8f8f8;
                padding: 5px;
                border-radius: 3px;
                border: 1px solid #ddd;
                max-height: 100px;
                overflow-y: auto;
            }
            .pf2e-preview-content .inline-roll {
                background: #1f5582;
                color: white;
                padding: 2px 4px;
                border-radius: 2px;
                font-weight: bold;
                text-decoration: none;
                border: 1px solid #0d4068;
                transition: background-color 0.2s;
            }
            .pf2e-preview-content .inline-roll:hover {
                background: #2a6590;
                text-decoration: none;
            }
            .pf2e-preview-content .inline-roll.damage {
                background: #8b0000;
                border-color: #660000;
            }
            .pf2e-preview-content .inline-roll.damage:hover {
                background: #a50000;
            }
            .pf2e-preview-content .inline-roll.healing {
                background: #006400;
                border-color: #004d00;
            }
            .pf2e-preview-content .inline-roll.healing:hover {
                background: #007800;
            }
        </style>
    `;

    const dialog = new Dialog({
        title: "PF2e Inline Roll Converter",
        content: dialogContent,
        buttons: {},
        render: (html) => {
            let showingDetails = false;
            
            // Add real-time conversion on input change
            const inputTextarea = html.find('#input-text');
            const outputTextarea = html.find('#output-text');
            const livePreview = html.find('#live-preview')[0];
            const statsDiv = html.find('#conversion-stats');
            const detailsDiv = html.find('#pattern-details');
            
            inputTextarea.on('input', async () => {
                const inputText = inputTextarea.val();
                if (inputText.trim()) {
                    const result = convertText(inputText);
                    const validation = validateDamageTypes(inputText);
                    
                    outputTextarea.val(result.convertedText);
                    
                    // Update live preview
                    await createLivePreview(result.convertedText, livePreview);
                    
                    let statsText = `Conversions: ${result.conversionsCount}`;
                    if (result.errors.length > 0) {
                        statsText += ` | Errors: ${result.errors.length}`;
                    }
                    if (validation.hasLegacyTypes) {
                        statsText += ` | Legacy types converted: ${validation.legacyTypes.join(', ')}`;
                    }
                    statsDiv.text(statsText);
                    
                    // Update pattern details
                    if (showingDetails && Object.keys(result.patternMatches).length > 0) {
                        const patternText = Object.entries(result.patternMatches)
                            .map(([pattern, count]) => `${pattern}: ${count}`)
                            .join(', ');
                        detailsDiv.text(`Patterns matched: ${patternText}`);
                    }
                } else {
                    outputTextarea.val('');
                    livePreview.innerHTML = '<em style="color: #999;">Live preview will appear here...</em>';
                    statsDiv.text('Ready to convert...');
                    detailsDiv.hide();
                }
            });
            
            // Copy output button handler
            html.find('#copy-output').click((event) => {
                event.preventDefault();
                event.stopPropagation();
                
                const outputText = outputTextarea.val();
                if (outputText.trim()) {
                    copyToClipboard(outputText);
                } else {
                    ui.notifications.warn("No converted text to copy.");
                }
            });
            
            // Clear all button handler
            html.find('#clear-all').click((event) => {
                event.preventDefault();
                event.stopPropagation();
                
                inputTextarea.val('');
                outputTextarea.val('');
                livePreview.innerHTML = '<em style="color: #999;">Live preview will appear here...</em>';
                statsDiv.text('Ready to convert...');
                detailsDiv.hide();
            });
            
            // Show details button handler
            html.find('#show-details').click((event) => {
                event.preventDefault();
                event.stopPropagation();
                
                showingDetails = !showingDetails;
                if (showingDetails) {
                    detailsDiv.show();
                    $(event.target).text('Hide Details');
                    // Trigger input event to update details
                    inputTextarea.trigger('input');
                } else {
                    detailsDiv.hide();
                    $(event.target).text('Show Details');
                }
            });
        }
    }, {
        width: 800,
        height: 700,
        resizable: true
    });

    dialog.render(true);
}

// Main execution
try {
    console.log('PF2e Inline Roll Converter v2.1: Starting...');
    
    // Verify we're in a PF2e game
    if (game.system.id !== 'pf2e') {
        ui.notifications.error("This macro is designed for the Pathfinder 2e system only.");
        return;
    }
    
    // Verify minimum Foundry version
    if (!game.version || parseInt(game.version.split('.')[0]) < 12) {
        ui.notifications.warn("This macro is designed for Foundry VTT v12+. Some features may not work properly.");
    }
    
    // Show the converter dialog
    showConverterDialog();
    
} catch (error) {
    console.error('PF2e Converter: Failed to initialize:', error);
    ui.notifications.error("Failed to start PF2e Inline Roll Converter. Check console for details.");
}