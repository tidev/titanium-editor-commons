/**
 * Keep distinct descriptions when a property name is shared by several types.
 * Identical text needs only one entry; differing text keeps its first source type.
 *
 * @param {Map<string, string>} descriptions - Text and first source type collected for this property.
 * @param {string} typeName - Type containing the property.
 * @param {string} description - Property documentation from JSCA.
 * @returns {string} Documentation for the merged property.
 */
export function mergePropertyDescription (descriptions: Map<string, string>, typeName: string, description: string): string {
	const text = description.replace(/<p>|<\/p>/g, '');
	if (text.trim() && !descriptions.has(text)) {
		descriptions.set(text, typeName.replace(/^Titanium\./, 'Ti.'));
	}
	if (descriptions.size < 2) {
		return descriptions.keys().next().value || '';
	}
	return Array.from(descriptions, ([ entry, source ]) => `${source}: ${entry}`).join('\n\n');
}
