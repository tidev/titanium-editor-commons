interface TagDictionary {
	[key: string]: Tag;
}
interface Tag {
	apiName: string;
}

interface PropertiesDictionary {
	[key: string]: Property;
}
interface Property {
	description: string;
	type: string;
	values?: string[];
}
interface TypeDictionary {
	[key: string]: Type;
}
interface Type {
	description: string;
	events: string[];
	functions: string[];
	properties: string[];
}
